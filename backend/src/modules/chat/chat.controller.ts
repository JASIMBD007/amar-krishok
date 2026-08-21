import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
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

  /**
   * Writing to a conversation requires a session. These two were optionally authenticated, which let
   * anyone who knew a thread id append a message to it under a display name of their choosing — into
   * a stranger's private dispute thread, attributed to the participant when staff read it. No shipped
   * client ever posted anonymously: the guest support widget keeps its conversation in the browser.
   */
  @Auth(Role.ADMIN, Role.BUYER, Role.FARMER)
  @Post("threads")
  createThread(@Body() dto: CreateChatThreadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.createThread(dto, user);
  }

  @Auth(Role.ADMIN, Role.BUYER, Role.FARMER)
  @Post("threads/:id/messages")
  createMessage(@Param("id") threadId: string, @Body() dto: CreateChatMessageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.createMessage(threadId, dto, user);
  }
}
