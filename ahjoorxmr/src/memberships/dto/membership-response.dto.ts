import { ApiProperty } from '@nestjs/swagger';
import { MembershipStatus } from '../entities/membership-status.enum';

/**
 * Response DTO for membership data.
 * Returns all membership fields with dates in ISO 8601 format.
 */
export class MembershipResponseDto {
  @ApiProperty({ description: 'Unique identifier for the membership' })
  id: string;

  @ApiProperty({ description: 'UUID of the group' })
  groupId: string;

  @ApiProperty({ description: 'UUID of the user' })
  userId: string;

  @ApiProperty({ description: 'Wallet address for receiving payouts' })
  walletAddress: string;

  @ApiProperty({
    description:
      'Position in payout queue (0-indexed). Null until group activation for RANDOM/ADMIN_DEFINED strategies',
    nullable: true,
  })
  payoutOrder: number | null;

  @ApiProperty({ description: 'Whether member has received their payout' })
  hasReceivedPayout: boolean;

  @ApiProperty({ description: 'Whether member has paid for current round' })
  hasPaidCurrentRound: boolean;

  @ApiProperty({
    enum: MembershipStatus,
    description: 'Current status of the membership',
  })
  status: MembershipStatus;

  @ApiProperty({ description: 'ISO 8601 timestamp of creation' })
  createdAt: string;

  @ApiProperty({ description: 'ISO 8601 timestamp of last update' })
  updatedAt: string;
}

