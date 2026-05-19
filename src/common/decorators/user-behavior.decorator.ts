import { SetMetadata } from '@nestjs/common';

export const USER_BEHAVIOR_KEY = 'userBehavior';

/** Mark a handler for explicit user-behavior logging (业务动作描述). */
export const UserBehavior = (description: string) => SetMetadata(USER_BEHAVIOR_KEY, description);
