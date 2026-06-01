import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Farm', 'farmId', 'userId')
    create(@Body() createDto: CreateTaskDto, @CurrentUser() user) {
        return this.tasksService.create(createDto, user?.id);
    }

    @Get()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Farm', 'farmId', 'userId')
    findAll(
        @Query('farmId') farmId: string,
        @Query('status') status?: string,
        @Query('assignedToId') assignedToId?: string,
    ) {
        return this.tasksService.findAll({ farmId, status, assignedToId });
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Task', 'id', 'farm.userId')
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
    @OwnsResource('Task', 'id', 'farm.userId')
    remove(@Param('id') id: string) {
        return this.tasksService.remove(id);
    }
}
