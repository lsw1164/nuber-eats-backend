import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Restaurant {
  @Field(() => String)
  name: String;

  @Field(() => Boolean)
  isVegan: Boolean;

  @Field(() => String)
  address: String;

  @Field(() => String)
  ownerName: String;
}
