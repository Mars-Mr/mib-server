import { PartialType } from '@nestjs/swagger';
import { CreateCourseTypeDto } from './create-course-type.dto';

export class UpdateCourseTypeDto extends PartialType(CreateCourseTypeDto) {}
