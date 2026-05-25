import { verifyPassword } from '@/shared/auth/password'
import { generateToken } from '@/shared/auth/jwt'
import { err, ok, type Result } from '@/shared/result'
import { findUserByUsernameWithDepartment } from '@/features/users/infrastructure/user.repository'
import type { CurrentUserDto, RoleDto } from '@/features/users/application/user.dto'

export interface LoginInput {
  username: string
  password: string
}

export interface LoginOutput {
  user: CurrentUserDto
  token: string
}

export async function loginUseCase(
  input: LoginInput,
): Promise<Result<LoginOutput>> {
  const { username, password } = input
  if (!username || !password) {
    return err(400, '用户名和密码不能为空')
  }

  const user = await findUserByUsernameWithDepartment(username.trim())
  if (!user) {
    return err(401, '用户名或密码错误')
  }

  if (!user.isActive) {
    return err(401, '账号已停用')
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return err(401, '用户名或密码错误')
  }

  const token = generateToken(user.id)

  return ok({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as RoleDto,
      departmentId: user.departmentId,
      departmentName: user.department?.name ?? '',
      isActive: user.isActive,
    },
    token,
  })
}
