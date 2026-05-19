import { PartialType } from '@nestjs/swagger';
import { CreateVenueDto } from './venue.dto';

export class UpdateVenueDto extends PartialType(CreateVenueDto) {}
