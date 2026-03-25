import { ApiProperty } from '@nestjs/swagger';
import { PayoutOrderStrategy } from '../entities/payout-order-strategy.enum';

/**
 * Response DTO for group data.
 * Returns all group fields with dates in ISO 8601 format.
 */
export class GroupResponseDto {
  @ApiProperty({ description: 'Unique identifier for the group' })
  id: string;

  @ApiProperty({
    description: 'Current status of the group',
    example: 'PENDING',
  })
  status: string;

  @ApiProperty({
    enum: PayoutOrderStrategy,
    description: 'Strategy for determining payout order',
    example: PayoutOrderStrategy.SEQUENTIAL,
  })
  payoutOrderStrategy: PayoutOrderStrategy;

  @ApiProperty({ description: 'ISO 8601 timestamp of creation' })
  createdAt: string;

  @ApiProperty({ description: 'ISO 8601 timestamp of last update' })
  updatedAt: string;
}
