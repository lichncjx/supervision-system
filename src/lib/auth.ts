export type Role =
  | 'admin'
  | 'supervisor'
  | 'department_manager'
  | 'department_leader'
  | 'vice_president'
  | 'president';

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: Role;
  department_id: number;
  is_active: boolean;
}

export interface Session {
  userId: number;
  username: string;
  name: string;
  role: Role;
  departmentId: number;
}

export const departments = [
  { id: 1, name: '公司领导', code: 'LD' },
  { id: 2, name: '综合处', code: 'ZH' },
  { id: 3, name: '计划生产处', code: 'JH' },
  { id: 4, name: '工艺技术处', code: 'GY' },
  { id: 5, name: '信息档案中心', code: 'XX' },
  { id: 6, name: '质量管理处', code: 'ZL' },
  { id: 7, name: '人力资源处', code: 'RL' },
  { id: 8, name: '综合财务处', code: 'CW' },
  { id: 9, name: '设备管理处', code: 'SB' },
  { id: 10, name: '行政保障处', code: 'XZ' },
  { id: 11, name: '保密处', code: 'BM' },
  { id: 12, name: '51车间', code: '51' },
  { id: 13, name: '53车间', code: '53' },
  { id: 14, name: '55车间', code: '55' },
  { id: 15, name: '56车间', code: '56' },
  { id: 16, name: '57车间', code: '57' },
  { id: 17, name: '58车间', code: '58' },
];

const DEFAULT_USERS: User[] = [
  { id: 1, username: 'admin', password: '123456', name: '系统管理员', role: 'admin', department_id: 1, is_active: true },
  { id: 2, username: 'president', password: '123456', name: '公司主要领导（一把手，兼主管领导）', role: 'president', department_id: 1, is_active: true },
  { id: 3, username: 'vice_president', password: '123456', name: '公司主管领导（副总）', role: 'vice_president', department_id: 1, is_active: true },
  { id: 4, username: 'dept_leader', password: '123456', name: '部门领导', role: 'department_leader', department_id: 2, is_active: true },
  { id: 5, username: 'dept_manager', password: '123456', name: '部门主管', role: 'department_manager', department_id: 2, is_active: true },
  { id: 6, username: 'supervisor', password: '123456', name: '督办管理员', role: 'supervisor', department_id: 1, is_active: true },
];

const USERS_KEY = 'supervision_users';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function normalizeRole(role: any): Role {
  if (role === 'dept_user') return 'department_manager';
  if (role === 'dept_manager') return 'department_manager';
  if (role === 'dept_leader') return 'department_leader';
  if (role === 'vp') return 'vice_president';
  if (role === 'ceo') return 'president';
  if (role === 'supervisor') return 'supervisor';
  if (role === '督办管理员') return 'supervisor';

  if (
    role === 'admin' ||
    role === 'supervisor' ||
    role === 'department_manager' ||
    role === 'department_leader' ||
    role === 'vice_president' ||
    role === 'president'
  ) {
    return role;
  }

  return 'department_manager';
}

function normalizeUser(raw: any): User | null {
  if (!raw || !raw.username) return null;

  const role = normalizeRole(raw.role);
  const isCompanyRole =
    role === 'admin' ||
    role === 'supervisor' ||
    role === 'vice_president' ||
    role === 'president';

  return {
    id: Number(raw.id) || Date.now(),
    username: String(raw.username),
    password: String(raw.password || '123456'),
    name: String(raw.name || raw.username),
    role,
    department_id: isCompanyRole ? 1 : Number(raw.department_id || raw.departmentId || 2),
    is_active: raw.is_active === false ? false : true,
  };
}

function saveUsers(list: User[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

export function getUsers(): User[] {
  if (!canUseStorage()) {
    return DEFAULT_USERS;
  }

  const raw = localStorage.getItem(USERS_KEY);

  if (!raw) {
    saveUsers(DEFAULT_USERS);
    return DEFAULT_USERS;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      saveUsers(DEFAULT_USERS);
      return DEFAULT_USERS;
    }

    const normalizedCustomUsers = parsed
      .map(normalizeUser)
      .filter(Boolean) as User[];

    const defaultUsernames = new Set(DEFAULT_USERS.map((u) => u.username));

    const customUsers = normalizedCustomUsers.filter(
      (u) => !defaultUsernames.has(u.username)
    );

    const mergedUsers = [...DEFAULT_USERS, ...customUsers];

    saveUsers(mergedUsers);

    return mergedUsers;
  } catch {
    saveUsers(DEFAULT_USERS);
    return DEFAULT_USERS;
  }
}

export function getUserById(id: number) {
  return getUsers().find((u) => u.id === id) || null;
}

export function addUser(input: Omit<User, 'id'>) {
  const list = getUsers();

  if (list.some((u) => u.username === input.username)) {
    throw new Error('用户名已存在');
  }

  const newUser: User = {
    ...input,
    id: Date.now(),
  };

  const next = [...list, newUser];
  saveUsers(next);
  return newUser;
}

export function updateUser(id: number, patch: Partial<User>) {
  const list = getUsers();
  const next = list.map((u) => (u.id === id ? { ...u, ...patch } : u));
  saveUsers(next);
  return next.find((u) => u.id === id) || null;
}

export function deleteUser(id: number) {
  const list = getUsers();

  if (id <= 6) {
    throw new Error('内置演示账号不允许删除');
  }

  const next = list.filter((u) => u.id !== id);
  saveUsers(next);
}

export function getUsersByDepartment(departmentId: number) {
  return getUsers().filter((u) => u.department_id === departmentId && u.is_active);
}

export function getDepartmentLeaders(departmentId: number) {
  return getUsers().filter(
    (u) =>
      u.department_id === departmentId &&
      u.role === 'department_leader' &&
      u.is_active
  );
}

export function getDepartmentManagers(departmentId: number) {
  return getUsers().filter(
    (u) =>
      u.department_id === departmentId &&
      u.role === 'department_manager' &&
      u.is_active
  );
}

export function getCompanyLeaders() {
  return getUsers().filter(
    (u) =>
      u.department_id === 1 &&
      (u.role === 'vice_president' || u.role === 'president') &&
      u.is_active
  );
}

export function login(username: string, password: string) {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  const foundUser = getUsers().find((u) => u.username === cleanUsername);

  if (!foundUser || foundUser.password !== cleanPassword || !foundUser.is_active) {
    return { success: false, error: '用户名或密码错误，或账号已停用' };
  }

  const token = `user:${foundUser.id}`;

  return {
    success: true,
    user: foundUser,
    token,
  };
}

export function verifyToken(token: string): Session | null {
  if (!token || !token.startsWith('user:')) return null;

  const id = Number(token.replace('user:', ''));
  const foundUser = getUserById(id);

  if (!foundUser || !foundUser.is_active) return null;

  return {
    userId: foundUser.id,
    username: foundUser.username,
    name: foundUser.name,
    role: foundUser.role,
    departmentId: foundUser.department_id,
  };
}

export function getRoleName(role: string) {
  const map: Record<string, string> = {
    admin: '系统管理员',
    supervisor: '督办管理员',
    department_manager: '部门主管',
    department_leader: '部门领导',
    vice_president: '公司主管领导（副总）',
    president: '公司主要领导（一把手，兼主管领导）',
  };
  return map[role] || role;
}

export function getDepartmentName(id?: number) {
  if (!id) return '-';
  return departments.find((d) => d.id === id)?.name || '-';
}

export function isCompanyLevel(role?: string, departmentId?: number) {
  return (
    role === 'admin' ||
    role === 'supervisor' ||
    role === 'vice_president' ||
    role === 'president' ||
    departmentId === 1
  );
}

export function isCompanyApprovalLeader(role?: string) {
  return role === 'vice_president' || role === 'president';
}

export function isPresident(role?: string) {
  return role === 'president';
}

export function isDepartmentApprover(role?: string) {
  return role === 'department_leader';
}