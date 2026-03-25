import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PayoutOrderStrategy } from '../entities/payout-order-strategy.enum';

export class CreateGroupDto {
  @ApiProperty({
    enum: PayoutOrderStrategy,
    default: PayoutOrderStrategy.SEQUENTIAL,
    description:
      'Strategy for determining payout order: SEQUENTIAL (first-join first-payout), RANDOM (randomized at activation), or ADMIN_DEFINED (manually assigned)',
    required: false,
  })
  @IsEnum(PayoutOrderStrategy)
  @IsOptional()
  payoutOrderStrategy?: PayoutOrderStrategy = PayoutOrderStrategy.SEQUENTIAL;
}
