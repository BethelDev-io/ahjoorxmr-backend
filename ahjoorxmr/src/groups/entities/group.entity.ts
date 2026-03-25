import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PayoutOrderStrategy } from './payout-order-strategy.enum';

/**
 * Group entity representing a ROSCA group.
 * Tracks group status and payout order strategy.
 */
@Entity('groups')
export class Group extends BaseEntity {
  @Column('varchar')
  status: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: PayoutOrderStrategy.SEQUENTIAL,
  })
  payoutOrderStrategy: PayoutOrderStrategy;
}
