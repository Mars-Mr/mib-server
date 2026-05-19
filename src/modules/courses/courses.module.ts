import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { CourseTypesController } from './course-types.controller';
import { CoursesService } from './courses.service';
import { SchedulesController } from './schedules.controller';
import { VenuesController } from './venues.controller';

@Module({
  controllers: [CourseTypesController, VenuesController, ClassesController, SchedulesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
