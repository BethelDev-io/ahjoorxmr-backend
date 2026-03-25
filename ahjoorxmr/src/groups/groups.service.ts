import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { PayoutOrderStrategy } from './entities/payout-order-strategy.enum';
import { WinstonLogger } from '../common/logger/winston.logger';

/**
 * Service responsible for managing group operations in ROSCA.
 * Handles business logic for group activation and payout order assignment.
 */
@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    private readonly logger: WinstonLogger,
  ) {}

  /**
   * Activates a ROSCA group and assigns payout orders based on the group's strategy.
   * 
   * For SEQUENTIAL: Payout orders remain as assigned during member addition.
   * For RANDOM: Shuffles the payout order among all members.
   * For ADMIN_DEFINED: Validates that all positions 0..N-1 are assigned.
   *
   * @param groupId - The UUID of the group to activate
   * @throws NotFoundException if the group doesn't exist
   * @throws BadRequestException if validation fails
   */
  async activateGroup(groupId: string): Promise<Group> {
    this.logger.log(`Activating group ${groupId}`, 'GroupsService');

    // Find the group
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      this.logger.warn(`Group ${groupId} not found`, 'GroupsService');
      throw new NotFoundException('Group not found');
    }

    if (group.status === 'ACTIVE') {
      this.logger.warn(
        `Group ${groupId} is already active`,
        'GroupsService',
      );
      throw new BadRequestException('Group is already active');
    }

    // Get all members
    const members = await this.membershipRepository.find({
      where: { groupId },
      order: { payoutOrder: 'ASC' },
    });

    if (members.length === 0) {
      this.logger.warn(
        `Cannot activate group ${groupId} with no members`,
        'GroupsService',
      );
      throw new BadRequestException('Cannot activate group with no members');
    }

    // Apply payout order strategy
    await this.applyPayoutOrderStrategy(group, members);

    // Update group status to ACTIVE
    group.status = 'ACTIVE';
    await this.groupRepository.save(group);

    this.logger.log(
      `Group ${groupId} activated with ${members.length} members using ${group.payoutOrderStrategy} strategy`,
      'GroupsService',
    );

    return group;
  }

  /**
   * Applies the payout order strategy to group members.
   * 
   * @param group - The group entity
   * @param members - Array of membership entities
   * @private
   */
  private async applyPayoutOrderStrategy(
    group: Group,
    members: Membership[],
  ): Promise<void> {
    const strategy = group.payoutOrderStrategy || PayoutOrderStrategy.SEQUENTIAL;

    switch (strategy) {
      case PayoutOrderStrategy.SEQUENTIAL:
        // No action needed - orders are already assigned sequentially
        this.logger.log(
          `Using SEQUENTIAL strategy for group ${group.id}`,
          'GroupsService',
        );
        break;

      case PayoutOrderStrategy.RANDOM:
        await this.randomizePayoutOrder(group.id, members);
        break;

      case PayoutOrderStrategy.ADMIN_DEFINED:
        this.validateAdminDefinedOrder(group.id, members);
        break;

      default:
        throw new BadRequestException(`Unknown payout order strategy: ${strategy}`);
    }
  }

  /**
   * Randomizes payout order for all members using Fisher-Yates shuffle.
   * 
   * @param groupId - The UUID of the group
   * @param members - Array of membership entities
   * @private
   */
  private async randomizePayoutOrder(
    groupId: string,
    members: Membership[],
  ): Promise<void> {
    this.logger.log(
      `Randomizing payout order for group ${groupId}`,
      'GroupsService',
    );

    // Create array of positions [0, 1, 2, ..., N-1]
    const positions = Array.from({ length: members.length }, (_, i) => i);

    // Fisher-Yates shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Assign shuffled positions to members
    for (let i = 0; i < members.length; i++) {
      members[i].payoutOrder = positions[i];
      await this.membershipRepository.save(members[i]);
    }

    this.logger.log(
      `Randomized payout order for ${members.length} members in group ${groupId}`,
      'GroupsService',
    );
  }

  /**
   * Validates that admin-defined payout orders cover all positions 0..N-1.
   * 
   * @param groupId - The UUID of the group
   * @param members - Array of membership entities
   * @throws BadRequestException if validation fails
   * @private
   */
  private validateAdminDefinedOrder(
    groupId: string,
    members: Membership[],
  ): void {
    this.logger.log(
      `Validating admin-defined payout order for group ${groupId}`,
      'GroupsService',
    );

    const memberCount = members.length;
    const payoutOrders = members
      .map((m) => m.payoutOrder)
      .sort((a, b) => (a ?? 0) - (b ?? 0));

    // Check for null/undefined values
    if (payoutOrders.some((order) => order === null || order === undefined)) {
      throw new BadRequestException(
        'ADMIN_DEFINED strategy requires all members to have assigned payout orders',
      );
    }

    // Check that all positions 0..N-1 are present
    const expectedOrders = Array.from({ length: memberCount }, (_, i) => i);
    const hasAllPositions = expectedOrders.every((expected) =>
      payoutOrders.includes(expected),
    );

    if (!hasAllPositions) {
      throw new BadRequestException(
        `ADMIN_DEFINED strategy requires all positions 0 to ${memberCount - 1} to be assigned. Found: ${payoutOrders.join(', ')}`,
      );
    }

    // Check for duplicates
    const uniqueOrders = new Set(payoutOrders);
    if (uniqueOrders.size !== memberCount) {
      throw new BadRequestException(
        'ADMIN_DEFINED strategy requires unique payout orders for all members',
      );
    }

    this.logger.log(
      `Admin-defined payout order validated for group ${groupId}`,
      'GroupsService',
    );
  }
}
