import { Injectable } from '@nestjs/common';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import { CategoryRepository } from './repositories/category.repository';
import { RESTAURANT_TAKE_COUNT } from './restaurant.constant';
import { RestaurantService } from './restaurant.service';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly restaurantService: RestaurantService,
  ) {}
  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return { ok: true, categories };
    } catch {
      return { ok: false, error: 'Could not load categories' };
    }
  }

  async findCategoryBySlug({
    slug,
    page,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne({ slug });
      if (!category) {
        return { ok: false, error: 'Category not found' };
      }
      category.restaurants = await this.restaurantService.findRestaurantsByCategory(
        category,
        page,
      );
      const totalResults = await this.restaurantService.countRestaurants(
        category,
      );
      return {
        ok: true,
        category,
        totalPages: Math.ceil(totalResults / RESTAURANT_TAKE_COUNT),
      };
    } catch {
      return { ok: false, error: 'Could not load category' };
    }
  }
}
