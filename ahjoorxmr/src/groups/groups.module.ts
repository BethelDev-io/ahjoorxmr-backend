import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './entities/group.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { WinstonLogger } from '../common/logger/winston.logger';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Membership])],
  controllers: [GroupsController],
  providers: [GroupsService, WinstonLogger],
  exports: [GroupsService],
})
export class GroupsModule {}
