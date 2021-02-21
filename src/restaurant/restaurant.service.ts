import { Injectable } from '@nestjs/common';
import { Restaurant } from './entities/restaurant.entity';
import { Raw, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import { User } from 'src/users/entities/user.entity';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { CategoryRepository } from './repositories/category.repository';
import { Category } from './entities/category.entity';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import { RestaurantsInput, RestaurantsOutput } from './dtos/restaurants.dto';
import { RESTAURANT_TAKE_COUNT } from './restaurant.constant';
import { RestaurantInput, RestaurantOutput } from './dtos/restaurant.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    private readonly categories: CategoryRepository,
  ) {}

  async createRestaurant(
    owner: User,
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = owner;
      const category = await this.categories.getOrCreate(
        createRestaurantInput.categoryName,
      );
      newRestaurant.category = category;
      await this.restaurants.save(newRestaurant);
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'Could not create restaurant',
      };
    }
  }

  async editRestaurant(
    owner: User,
    editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne(
        editRestaurantInput.restaurantId,
      );
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: "You can't edit a restaurant that you don't own",
        };
      }
      let category: Category = null;
      if (editRestaurantInput.categoryName) {
        category = await this.categories.getOrCreate(
          editRestaurantInput.categoryName,
        );
      }
      const editedRestaurant = {
        id: editRestaurantInput.restaurantId,
        ...editRestaurantInput,
        ...(category && { category }),
      };
      await this.restaurants.save([editedRestaurant]);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not edit Restaurant' };
    }
  }

  async deleteRestaurant(
    owner: User,
    { restaurantId }: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: "You can't delete a restaurant that you don't own",
        };
      }
      await this.restaurants.delete(restaurantId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not delete Restaurant' };
    }
  }

  async countRestaurants(category: Category): Promise<number> {
    try {
      return this.restaurants.count({ category });
    } catch {
      return 0;
    }
  }

  async allRestaurants({ page }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        skip: (page - 1) * RESTAURANT_TAKE_COUNT,
        take: RESTAURANT_TAKE_COUNT,
      });
      return {
        ok: true,
        results: restaurants,
        totalPages: Math.ceil(totalResults / RESTAURANT_TAKE_COUNT),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load restaurants',
      };
    }
  }

  async findRestaurantsByCategory(
    category: Category,
    page: number,
  ): Promise<Restaurant[]> {
    try {
      const restaurants = await this.restaurants.find({
        where: { category },
        take: RESTAURANT_TAKE_COUNT,
        skip: (page - 1) * RESTAURANT_TAKE_COUNT,
      });
      console.log(restaurants);
      return restaurants;
    } catch {
      return [];
    }
  }

  async findRestaurantsById({
    restaurantId,
  }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      return { ok: true, restaurant };
    } catch {
      return { ok: false, error: 'Could not find restaurant' };
    }
  }

  async searchRestaurantByName({
    query,
    page,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        where: { name: Raw((name) => `${name} ILIKE '%${query}%'`) },
        skip: (page - 1) * RESTAURANT_TAKE_COUNT,
        take: RESTAURANT_TAKE_COUNT,
      });
      return {
        ok: true,
        restaurants,
        totalResults,
        totalPages: Math.ceil(totalResults / RESTAURANT_TAKE_COUNT),
      };
    } catch {
      return { ok: false, error: 'Could not search for restaurants' };
    }
  }
}
