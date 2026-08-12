import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { OptionalAuthGuard } from "../auth/guards/optional-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ChatService } from "./chat.service";
import { CreateChatMessageDto, CreateChatThreadDto } from "./dto/chat.dto";

@ApiTags("chat")
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Auth(Role.ADMIN)
  @Get("threads")
  findThreads() {
    return this.chatService.findThreads();
  }

  /** A signed-in person's own conversations. Staff get every thread, as they do from /threads. */
  @Auth(Role.ADMIN, Role.BUYER, Role.FARMER)
  @Get("my-threads")
  findMyThreads(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.findMyThreads(user);
  }

  @Auth(Role.ADMIN, Role.BUYER, Role.FARMER)
  @Post("threads/:id/read")
  markRead(@Param("id") threadId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.markRead(threadId, user);
  }

  @UseGuards(OptionalAuthGuard)
  @Post("threads")
  createThread(@Body() dto: CreateChatThreadDto, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.chatService.createThread(dto, user);
  }

  @UseGuards(OptionalAuthGuard)
  @Post("threads/:id/messages")
  createMessage(@Param("id") threadId: string, @Body() dto: CreateChatMessageDto, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.chatService.createMessage(threadId, dto, user);
  }
}
