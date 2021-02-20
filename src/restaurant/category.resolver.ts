import { Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Repository } from 'typeorm';
import { CategoryService } from './category.service';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { Category } from './entities/category.entity';
import { RestaurantService } from './restaurant.service';

@Resolver((of) => Category)
export class CategoryResolver {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly restaurantService: RestaurantService,
  ) {}

  @ResolveField((type) => Int)
  restaurantCount(@Parent() category: Category): Promise<Number> {
    return this.restaurantService.countRestaurants(category);
  }

  @Query((type) => AllCategoriesOutput)
  allCategories(): Promise<AllCategoriesOutput> {
    return this.categoryService.allCategories();
  }
}
