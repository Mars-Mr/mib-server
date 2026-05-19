import { IsString } from 'class-validator';

export class LinkTagDto {
  @IsString()
  tagId: string;
}

export class LinkGroupDto {
  @IsString()
  groupId: string;
}

export class CreateTagDto {
  @IsString()
  name: string;
}

export class CreateGroupDto {
  @IsString()
  name: string;
}
