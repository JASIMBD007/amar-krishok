import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
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

  @Post("threads")
  createThread(@Body() dto: CreateChatThreadDto) {
    return this.chatService.createThread(dto);
  }

  @Post("threads/:id/messages")
  createMessage(@Param("id") threadId: string, @Body() dto: CreateChatMessageDto) {
    return this.chatService.createMessage(threadId, dto);
  }
}
