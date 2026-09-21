import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateReviewDto } from "./dto/review.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("reviews")
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** Public: what a buyer reads on a lot page before deciding to trust a farmer. */
  @Get("farmers/:farmerId/reviews")
  findForFarmer(@Param("farmerId") farmerId: string) {
    return this.reviewsService.findForFarmer(farmerId);
  }

  /** Which of an order's farmers the buyer can still review, so the UI need not guess. */
  @Auth(Role.ADMIN, Role.BUYER)
  @Get("orders/:orderId/reviewable")
  findReviewable(@Param("orderId") orderId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.findReviewable(orderId, user);
  }

  @Auth(Role.ADMIN, Role.BUYER)
  @Post("orders/:orderId/reviews")
  create(@Param("orderId") orderId: string, @Body() dto: CreateReviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.create(orderId, dto, user);
  }

  @Auth(Role.ADMIN)
  @Patch("admin/reviews/:id/hide")
  hide(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.setHidden(id, true, user);
  }

  @Auth(Role.ADMIN)
  @Patch("admin/reviews/:id/unhide")
  unhide(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.setHidden(id, false, user);
  }
}
