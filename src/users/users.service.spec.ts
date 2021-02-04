import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from 'src/jwt/jwt.service';
import { MailService } from 'src/mail/mail.service';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { UsersService } from './users.service';

const mockUsersRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  findOneOrFail: jest.fn(),
  delete: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(),
});

const mockMailService = () => ({
  sendVerificationEmail: jest.fn(),
});

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UsersService', () => {
  let usersService: UsersService;
  let usersRepository: MockRepository<User>;
  let verificationsRepository: MockRepository<Verification>;
  let mailService: MailService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockUsersRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
        {
          provide: MailService,
          useValue: mockMailService(),
        },
      ],
    }).compile();
    usersService = module.get<UsersService>(UsersService);
    mailService = module.get<MailService>(MailService);
    jwtService = module.get<JwtService>(JwtService);
    usersRepository = module.get(getRepositoryToken(User));
    verificationsRepository = module.get(getRepositoryToken(Verification));
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
  });

  describe('createAccount', () => {
    const mockEmail = 'mock@gmail.com';
    const createAccountArgs = {
      email: mockEmail,
      password: '123',
      role: 0,
    };
    it('should fail if user exists', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: mockEmail,
      });
      const result = await usersService.createAccount(createAccountArgs);
      expect(result).toMatchObject({
        ok: false,
        error: 'There is a user with that email already',
      });
    });

    it('should create a new user', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue(createAccountArgs);
      usersRepository.save.mockResolvedValue(createAccountArgs);
      verificationsRepository.create.mockReturnValue({
        user: createAccountArgs,
      });
      verificationsRepository.save.mockResolvedValue({ code: 'code' });

      const result = await usersService.createAccount(createAccountArgs);

      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountArgs);

      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(createAccountArgs);

      expect(verificationsRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(verificationsRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.save).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );

      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await usersService.createAccount(createAccountArgs);
      expect(result).toEqual({ ok: false, error: "Couldn't create account" });
    });
  });
  describe('login', () => {
    const mockEmail = 'mock@gmail.com';
    const loginArgs = {
      email: mockEmail,
      password: '123',
    };
    it('should fail if user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await usersService.login(loginArgs);
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toEqual({ ok: false, error: 'User not found' });
    });
    it('should fail if the password is wrong', async () => {
      const mockedUser = {
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await usersService.login(loginArgs);
      expect(result).toEqual({ ok: false, error: 'Wrong Password' });
    });
    it('should return token if password correct', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await usersService.login(loginArgs);
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toBeCalledWith(expect.any(Number));
      expect(result).toEqual({ ok: true, token: 'signed-token' });
    });
    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await usersService.login(loginArgs);
      expect(result).toEqual({ ok: false, error: "Can't log user in" });
    });
  });
  describe('findById', () => {
    const findByIdArg = 1;
    const user = { id: 1 };
    it('should find an existing user', async () => {
      usersRepository.findOneOrFail.mockResolvedValue(user);
      const result = await usersService.findById(findByIdArg);
      expect(result).toEqual({ ok: true, user });
    });
    it('should fail if no user is found', async () => {
      usersRepository.findOneOrFail.mockRejectedValue(new Error());
      const result = await usersService.findById(findByIdArg);
      expect(result).toEqual({ ok: false, error: 'User not found' });
    });
  });
  describe('editProfile', () => {
    it('should change email', async () => {
      const OLD_EMAIL = 'old_email';
      const NEW_EMAIL = 'new_email';
      const oldUser = {
        email: OLD_EMAIL,
        verified: true,
      };
      const newUser = {
        email: NEW_EMAIL,
        verified: false,
      };
      const newVerification = { code: 'code' };
      const editProfileArgs = {
        userId: 1,
        input: newUser,
      };
      usersRepository.findOne.mockResolvedValue(oldUser);
      verificationsRepository.create.mockReturnValue(newVerification);
      verificationsRepository.save.mockResolvedValue(newVerification);
      const result = await usersService.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(result).toEqual({ ok: true });
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId,
      );

      expect(verificationsRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: newUser,
      });
      expect(verificationsRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.save).toHaveBeenCalledWith(
        newVerification,
      );

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        newUser.email,
        newVerification.code,
      );

      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(editProfileArgs.input);
    });
    it('should change password', async () => {
      const OLD_PASSWORD = 'old_password';
      const NEW_PASSWORD = 'new_password';
      const editProfileArgs = {
        userId: 1,
        input: { password: NEW_PASSWORD },
      };
      usersRepository.findOne.mockResolvedValue({ password: OLD_PASSWORD });
      const result = await usersService.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(usersRepository.save).toBeCalledTimes(1);
      expect(usersRepository.save).toBeCalledWith(editProfileArgs.input);
      expect(result).toEqual({ ok: true });
    });
    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await usersService.editProfile(1, { email: 'email' });
      expect(result).toEqual({ ok: false, error: 'Could not update profile' });
    });
  });

  describe('verifyEmail', () => {
    const mockVerification = {
      user: { verified: false },
      id: 1,
    };
    it('should verify email', async () => {
      verificationsRepository.findOne.mockResolvedValue(mockVerification);
      const result = await usersService.verifyEmail('code');
      expect(verificationsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith({ verified: true });
      expect(usersRepository.delete).toHaveBeenCalledTimes(1);
      expect(usersRepository.delete).toHaveBeenCalledWith(mockVerification.id);
      expect(result).toEqual({ ok: true });
    });

    it('should fail on verification not found', async () => {
      verificationsRepository.findOne.mockResolvedValue(null);
      const result = await usersService.verifyEmail('');
      expect(result).toEqual({ ok: false, error: 'Verification not found' });
    });
    it('should fail on exception', async () => {
      verificationsRepository.findOne.mockRejectedValue(new Error());
      const result = await usersService.verifyEmail('');
      expect(result).toEqual({ ok: false, error: 'Could not verify email.' });
    });
  });
});
