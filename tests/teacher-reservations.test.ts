import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), task: vi.fn(), profile: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (value: unknown) => value;
    const chain = {
      middleware: () => chain,
      inputValidator: (fn: typeof validate) => { validate = fn; return chain; },
      handler: (fn: (input: unknown) => unknown) => async (data: unknown) => fn({
        data: validate(data), context: { userId: "test-teacher", supabase: { rpc: mocks.rpc } },
      }),
    };
    return chain;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/school-data.server", () => ({ fetchAdminProfile: mocks.profile }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.task }) }) }),
} }));

import { teacherAssignTask, teacherCreateReservations } from "@/lib/teacher.functions";

// The framework is mocked only to expose validation and handlers; permissions
// are delegated to the real participant-scoped RPC, never bypassed with admin writes.
const create = teacherCreateReservations as unknown as (input: unknown) => Promise<{ created: number }>;
const assign = teacherAssignTask as unknown as (input: unknown) => Promise<{ created: number; total: number }>;
const input = { studentIds: ["student-7A"], date: "2026-10-28", start: "", end: "", hours: 3, kind: "volunteer", note: "Privaloma auklėtojo veikla" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({ data: 1, error: null });
  mocks.profile.mockResolvedValue({ role: "school_admin" });
  mocks.task.mockResolvedValue({ data: { organization_id: "test-org" } });
});

describe("teacher reservation creation and assignment", () => {
  it("sends selected students and optional times through the authenticated school RPC", async () => {
    expect(await create(input)).toEqual({ created: 1 });
    expect(mocks.rpc).toHaveBeenCalledWith("school_create_reservations", {
      _student_ids: ["student-7A"], _organization_id: null, _task_id: null,
      _date: "2026-10-28", _start: null, _end: null, _hours: 3,
      _kind: "volunteer", _note: input.note,
    });
  });
  it("does not create reservations without selected students", async () => {
    await expect(create({ ...input, studentIds: [] })).rejects.toThrow("Pasirink bent vieną mokinį");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("propagates class-scope denial instead of reporting success", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Mokinys nepriklauso jūsų klasei" } });
    await expect(create(input)).rejects.toThrow("Mokinys nepriklauso jūsų klasei");
  });
  it("assigns the selected task and its organization to the chosen student", async () => {
    expect(await assign({ ...input, taskId: "test-task" })).toEqual({ created: 1, total: 1 });
    expect(mocks.rpc).toHaveBeenCalledWith("school_create_reservations", expect.objectContaining({
      _student_ids: ["student-7A"], _task_id: "test-task", _organization_id: "test-org", _hours: 3,
    }));
  });
  it("cannot assign a task as a student", async () => {
    mocks.profile.mockResolvedValue({ role: "student" });
    await expect(assign({ ...input, taskId: "test-task" })).rejects.toThrow("Prieiga tik mokyklos administratoriams");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("cannot assign a nonexistent task", async () => {
    mocks.task.mockResolvedValue({ data: null });
    await expect(assign({ ...input, taskId: "missing" })).rejects.toThrow("Veikla nerasta");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});