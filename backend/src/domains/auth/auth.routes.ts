import { compare } from 'bcrypt';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { signAccessToken, signRefreshToken } from '../../shared/plugins/auth.js';
import { createUserService } from '../users/user.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const userService = createUserService(fastify.prisma);

  fastify.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request body' });
    }
    const { email, password } = parsed.data;

    const user = await userService.getByEmail(email);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    await userService.updateLastLogin(user.id);

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: user.id, tenantId: user.tenantId });

    return reply.send({ accessToken, refreshToken });
  });
}
