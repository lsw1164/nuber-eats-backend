import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { getConnection, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});

const GRAPHQL_ENDPOINT = '/graphql';
const testUser = Object.freeze({
  email: 'test@gmail.com',
  password: '123',
});

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let usersRepository: Repository<User>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  describe('createAccount', () => {
    const QUERY = `
              mutation {
                createAccount(input: {
                  email:"${testUser.email}", 
                  password : "${testUser.password}",
                  role: Owner
                }) {
                  ok,
                  error
                }
              }
        `;
    it('should create account', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({ query: QUERY })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount).toEqual({
            ok: true,
            error: null,
          });
        });
    });

    it('should fail if account already exists', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({ query: QUERY })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount).toEqual({
            ok: false,
            error: 'There is a user with that email already',
          });
        });
    });
  });
  describe('login', () => {
    it('should login with correct credentials', () => {
      const QUERY = `
      mutation {
        login(input:{email :"${testUser.email}", password:"${testUser.password}"}) {
          ok,
          error,
          token
        }
      }`;
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({ query: QUERY })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login).toEqual({
            ok: true,
            error: null,
            token: expect.any(String),
          });
          jwtToken = login.token;
        });
    });
    it('should not be able to login with wrong credentials', () => {
      const QUERY = `
      mutation {
        login(input:{email :"${testUser.email}", password:"wrong"}) {
          ok,
          error,
          token
        }
      }`;
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({ query: QUERY })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login).toEqual({
            ok: false,
            error: 'Wrong Password',
            token: null,
          });
        });
    });
  });
  describe('userProfile', () => {
    let userId: number;
    beforeAll(async () => {
      const [user] = await usersRepository.find();
      userId = user.id;
    });
    it('should find my profile', () => {
      const QUERY = `
      {
        userProfile(userId: ${userId}) {
          ok,
          error,
          user {
            id,
            email
          }
        }
      }
    `;
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('x-jwt', jwtToken)
        .send({ query: QUERY })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { userProfile },
            },
          } = res;
          expect(userProfile).toEqual({
            ok: true,
            error: null,
            user: expect.any(Object),
          });
        });
    });
    it('should not allow logged out user', () => {
      const QUERY = `
      {
        userProfile(userId: 999) {
          ok,
          error,
          user {
            id,
            email
          }
        }
      }
    `;
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('x-jwt', jwtToken)
        .send({ query: QUERY })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { userProfile },
            },
          } = res;
          expect(userProfile).toEqual({
            ok: false,
            error: 'User not found',
            user: null,
          });
        });
    });
  });
  it.todo('me');
  it.todo('editProfile');
  it.todo('verifyEmail');
});
