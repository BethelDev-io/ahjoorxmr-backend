import { Controller, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { GroupResponseDto } from './dto/group-response.dto';

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post(':groupId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate a ROSCA group',
    description:
      'Activates a group and assigns payout orders based on the configured strategy. ' +
      'SEQUENTIAL: maintains join order. RANDOM: shuffles order. ADMIN_DEFINED: validates all positions are assigned.',
  })
  @ApiParam({
    name: 'groupId',
    description: 'UUID of the group to activate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Group successfully activated',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - group already active, no members, or invalid admin-defined orders',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  async activateGroup(@Param('groupId') groupId: string): Promise<GroupResponseDto> {
    const group = await this.groupsService.activateGroup(groupId);
    
    return {
      id: group.id,
      status: group.status,
      payoutOrderStrategy: group.payoutOrderStrategy,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };
  }
}
