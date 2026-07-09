import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(OwnershipGuard)
  @OwnsResource('Farm', 'farmId', 'userId', 'WRITE_MANAGEMENT')
  create(@Body() createDto: CreateTaskDto, @CurrentUser() user) {
    return this.tasksService.create(createDto, user?.id);
  }

  @Get()
  @UseGuards(OwnershipGuard)
  @OwnsResource('Farm', 'farmId', 'userId', 'READ')
  findAll(
    @Query('farmId') farmId: string,
    @Query('status') status?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.tasksService.findAll({ farmId, status, assignedToId });
  }

  @Get(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Task', 'id', 'farm.userId', 'READ')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Task', 'id', 'farm.userId')
  update(@Param('id') id: string, @Body() updateDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Task', 'id', 'farm.userId', 'OWNER_ONLY')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }

  /** Worker marks their assigned task done (assignee-only enforced in service). */
  @Post(':id/complete')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Task', 'id', 'farm.userId', 'WRITE_OPERATIONAL')
  complete(@Param('id') id: string, @CurrentUser() user) {
    return this.tasksService.complete(id, user.id);
  }

  /** Manager/owner verifies a completed task. */
  @Post(':id/verify')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Task', 'id', 'farm.userId', 'WRITE_MANAGEMENT')
  verify(@Param('id') id: string, @CurrentUser() user) {
    return this.tasksService.verify(id, user.id);
  }
}
