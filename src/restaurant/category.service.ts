import { Injectable } from '@nestjs/common';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryRepository } from './repositories/category.repository';

@Injectable()
export class CategoryService {
  constructor(private readonly categories: CategoryRepository) {}
  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return { ok: true, categories };
    } catch {
      return { ok: false, error: 'Could not load categories' };
    }
  }
}
