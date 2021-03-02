import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATE,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';
import { Dish } from 'src/restaurant/entities/dish.entity';
import { Restaurant } from 'src/restaurant/entities/restaurant.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderIntput, CreateOrderOutput } from './dtos/create-order-dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { TakeOrderInput, TakeOrderOutput } from './dtos/take-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Dish) private readonly dishes: Repository<Dish>,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}
  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderIntput,
  ): Promise<CreateOrderOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      let orderFinalPrice = 0;
      const orderItems: OrderItem[] = [];

      for (const item of items) {
        const dish = await this.dishes.findOne(item.dishId);
        if (!dish) {
          return { ok: false, error: 'Dish not found.' };
        }
        let dishFinalPrice = dish.price;
        const itemOptions = item.options ?? [];
        for (const itemOption of itemOptions) {
          const dishOption = dish.options.find(
            (dishOption) => dishOption.name === itemOption.name,
          );
          if (!dishOption) {
            continue;
          }
          if (dishOption.extra) {
            dishFinalPrice += dishOption.extra;
          } else {
            const dishOptionChoice = dishOption.choices.find(
              (optionChoice) => optionChoice.name === itemOption.choice,
            );
            if (dishOptionChoice?.extra) {
              dishFinalPrice += dishOptionChoice.extra;
            }
          }
        }
        orderFinalPrice += dishFinalPrice;
        const orderItem = await this.orderItems.save(
          this.orderItems.create({
            dish,
            options: item.options,
          }),
        );
        orderItems.push(orderItem);
      }
      const order = await this.orders.save(
        this.orders.create({
          customer,
          restaurant,
          total: orderFinalPrice,
          items: orderItems,
        }),
      );
      await this.pubSub.publish(NEW_PENDING_ORDER, {
        pendingOrders: { order, ownerId: restaurant.ownerId },
      });
      return { ok: true };
    } catch (error) {
      console.log(error);
      return { ok: false, error: 'Could not create order.' };
    }
  }

  async getOrders(
    user: User,
    { status }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    try {
      let orders: Order[];
      switch (user.role) {
        case UserRole.Client:
          orders = await this.orders.find({
            where: {
              customer: user,
              ...(status && { status }),
            },
          });
          break;
        case UserRole.Delivery:
          orders = await this.orders.find({
            where: {
              driver: user,
              ...(status && { status }),
            },
          });
          break;
        case UserRole.Owner:
          const restaurants = await this.restaurants.find({
            where: { owner: user },
            relations: ['orders'],
          });
          orders = restaurants.map((restaurant) => restaurant.orders).flat(1);
          if (status) {
            orders = orders.filter((order) => order.status === status);
          }
      }
      return { ok: true, orders };
    } catch {
      return { ok: false, error: 'Could not get orders' };
    }
  }

  async getOrder(
    user: User,
    { id: orderId }: GetOrderInput,
  ): Promise<GetOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId, {
        relations: ['restaurant'],
      });
      if (!order) {
        return { ok: false, error: 'Order not found.' };
      }
      if (!this.canSeeOrder(user, order)) {
        return { ok: false, error: 'You cant see that' };
      }
      return { ok: true, order };
    } catch {
      return { ok: false, error: 'Could not load order.' };
    }
  }

  async editOrder(
    user: User,
    { id: orderId, status }: EditOrderInput,
  ): Promise<EditOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId);
      if (!order) {
        return { ok: false, error: 'Order not found.' };
      }
      if (!this.canSeeOrder(user, order)) {
        return { ok: false, error: "Can't see order." };
      }
      if (!this.canEditOrder(user, status)) {
        return { ok: false, error: "Can't edit order." };
      }
      await this.orders.save([
        {
          id: orderId,
          status,
        },
      ]);
      const newOrder = { ...order, status };
      if (user.role === UserRole.Owner && status === OrderStatus.Cooked) {
        await this.pubSub.publish(NEW_COOKED_ORDER, {
          cookedOrders: newOrder,
        });
      }
      await this.pubSub.publish(NEW_ORDER_UPDATE, { orderUpdates: newOrder });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not edit order.' };
    }
  }

  canSeeOrder(user: User, order: Order): boolean {
    if (user.role === UserRole.Client) {
      return user.id === order.customerId;
    }
    if (user.role === UserRole.Delivery) {
      return user.id === order.driverId;
    }
    if (user.role === UserRole.Owner) {
      return user.id === order.restaurant.ownerId;
    }
    return false;
  }

  canEditOrder(user: User, status: OrderStatus): boolean {
    if (user.role === UserRole.Client) {
      return false;
    }
    if (user.role === UserRole.Delivery) {
      return (
        status === OrderStatus.PickedUp || status === OrderStatus.Delivered
      );
    }
    if (user.role === UserRole.Owner) {
      return status === OrderStatus.Cooking || status === OrderStatus.Cooked;
    }
    return false;
  }

  async takeOrder(
    driver: User,
    { id: orderId }: TakeOrderInput,
  ): Promise<TakeOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId);
      if (!order) {
        return { ok: false, error: 'Order not found' };
      }
      if (order.driver) {
        return { ok: false, error: 'This order already has a driver' };
      }
      await this.orders.save({
        id: orderId,
        driver,
      });
      await this.pubSub.publish(NEW_ORDER_UPDATE, {
        orderUpdates: { ...order, driver },
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not upate order.' };
    }
  }
}
