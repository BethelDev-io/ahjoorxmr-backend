import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contribution } from '../../contributions/entities/contribution.entity';
import { Group } from '../../groups/entities/group.entity';
import { Membership } from '../../memberships/entities/membership.entity';

interface ContributionSummary {
  groupId: string;
  groupName: string;
  totalContributions: number;
  totalAmount: string;
  memberCount: number;
  contributions: {
    userId: string;
    walletAddress: string;
    amount: string;
    roundNumber: number;
  }[];
}

interface ProgressJob {
  updateProgress(progress: number): Promise<void>;
}

@Injectable()
export class ContributionSummaryService {
  private readonly logger = new Logger(ContributionSummaryService.name);

  constructor(
    @InjectRepository(Contribution)
    private readonly contributionRepository: Repository<Contribution>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate weekly contribution summaries for all active groups
   */
  async generateWeeklySummaries(
    job?: ProgressJob,
  ): Promise<ContributionSummary[]> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const batchSize = Number(
      this.configService.get<string>('SUMMARY_BATCH_SIZE', '500'),
    );
    const maxHeapMb = Number(
      this.configService.get<string>('SCHEDULER_MAX_HEAP_MB', '512'),
    );

    try {
      // Get all active groups
      const groups = await this.groupRepository.find({
        where: { status: 'ACTIVE' as any },
      });

      const summaries: ContributionSummary[] = [];
      let totalRows = 0;

      for (const group of groups) {
        const summaryMetrics = await this.contributionRepository
          .createQueryBuilder('c')
          .select('COUNT(*)', 'totalContributions')
          .addSelect(
            'COALESCE(SUM(CAST(c.amount AS NUMERIC)), 0)',
            'totalAmount',
          )
          .where('c.groupId = :groupId', { groupId: group.id })
          .andWhere('c.createdAt >= :weekAgo', { weekAgo })
          .getRawOne<{ totalcontributions?: string; totalamount?: string }>();

        totalRows += Number(summaryMetrics?.totalcontributions ?? 0);
      }

      let processedRows = 0;
      let stopForMemoryPressure = false;

      for (const group of groups) {
        // Get member count
        const memberCount = await this.membershipRepository.count({
          where: { groupId: group.id },
        });

        const aggregate = await this.contributionRepository
          .createQueryBuilder('c')
          .select('COUNT(*)', 'totalContributions')
          .addSelect(
            'COALESCE(SUM(CAST(c.amount AS NUMERIC)), 0)',
            'totalAmount',
          )
          .where('c.groupId = :groupId', { groupId: group.id })
          .andWhere('c.createdAt >= :weekAgo', { weekAgo })
          .getRawOne<{ totalcontributions?: string; totalamount?: string }>();

        const totalContributions = Number(aggregate?.totalcontributions ?? 0);
        const totalAmount = String(aggregate?.totalamount ?? '0');

        const contributions: ContributionSummary['contributions'] = [];
        let offset = 0;

        while (offset < totalContributions) {
          const batch = await this.contributionRepository
            .createQueryBuilder('c')
            .select([
              'c.userId',
              'c.walletAddress',
              'c.amount',
              'c.roundNumber',
            ])
            .where('c.groupId = :groupId', { groupId: group.id })
            .andWhere('c.createdAt >= :weekAgo', { weekAgo })
            .orderBy('c.createdAt', 'DESC')
            .offset(offset)
            .limit(batchSize)
            .getMany();

          contributions.push(
            ...batch.map((c) => ({
              userId: c.userId,
              walletAddress: c.walletAddress,
              amount: c.amount,
              roundNumber: c.roundNumber,
            })),
          );

          processedRows += batch.length;
          offset += batch.length;

          if (job && totalRows > 0) {
            const progress = Math.min(
              100,
              Math.round((processedRows / totalRows) * 100),
            );
            await job.updateProgress(progress);
          }

          const heapUsedMb = process.memoryUsage().heapUsed / (1024 * 1024);
          if (heapUsedMb > maxHeapMb) {
            const alertPayload = {
              event: 'scheduler_memory_guard_triggered',
              groupId: group.id,
              heapUsedMb: Number(heapUsedMb.toFixed(2)),
              thresholdMb: maxHeapMb,
            };
            this.logger.error(JSON.stringify(alertPayload));

            const webhook = this.configService.get<string>(
              'SCHEDULER_MEMORY_ALERT_WEBHOOK',
            );
            if (webhook) {
              await fetch(webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alertPayload),
              }).catch((error) => {
                this.logger.warn(
                  `Failed to send scheduler memory alert webhook: ${(error as Error).message}`,
                );
              });
            }

            stopForMemoryPressure = true;
            break;
          }

          // Release references early between batches to reduce peak heap pressure.
          batch.length = 0;
        }

        summaries.push({
          groupId: group.id,
          groupName: group.name,
          totalContributions,
          totalAmount,
          memberCount,
          contributions,
        });

        if (stopForMemoryPressure) {
          this.logger.warn(
            'Pausing contribution summary processing due to memory guard threshold',
          );
          break;
        }
      }

      this.logger.log(
        `Generated ${summaries.length} weekly contribution summaries`,
      );
      return summaries;
    } catch (error) {
      this.logger.error('Failed to generate weekly summaries:', error);
      throw error;
    }
  }

  /**
   * Send contribution summary to group members
   * In a real implementation, this would integrate with a notification service
   */
  async sendSummariesToMembers(
    summaries: ContributionSummary[],
  ): Promise<void> {
    for (const summary of summaries) {
      // Get all members of the group
      const memberships = await this.membershipRepository.find({
        where: { groupId: summary.groupId },
        relations: ['user'],
      });

      this.logger.log(
        `Sending summary for group ${summary.groupName} to ${memberships.length} members`,
      );

      // TODO: Integrate with notification service to send emails/push notifications
      // For now, just log the summary
      this.logger.debug(`Summary: ${JSON.stringify(summary, null, 2)}`);
    }
  }
}
