export interface paths {
  "/api/v1/health": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["read_health"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/leads": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["list_leads"];
    put?: never;
    post: operations["create_lead"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/leads/follow-ups": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["list_follow_ups"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/leads/stats": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["read_lead_stats"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/leads/{lead_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_lead"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch: operations["update_lead"];
    trace?: never;
  };
  "/api/v1/leads/{lead_id}/follow-up/complete": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["complete_follow_up"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/leads/{lead_id}/activities": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["list_activities"];
    put?: never;
    post: operations["log_note"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/leads/{lead_id}/activities/{activity_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_activity"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    ActivityKind: "note" | "lead_created" | "status_changed" | "follow_up_completed";
    ActivityPage: {
      items: components["schemas"]["ActivityRead"][];
      next_cursor: string | null;
    };
    ActivityRead: {
      id: string;
      lead_id: string;
      kind: components["schemas"]["ActivityKind"];
      body: string | null;
      follow_up_at: string | null;
      meta: {
        [key: string]: string | null;
      } | null;
      occurred_at: string;
    };
    DuplicatePhoneProblem: {
      type: string;
      title: string;
      status: number;
      detail: string;
      instance: string;
      request_id: string | null;
      errors: components["schemas"]["ProblemFieldError"][];
      existing_lead_id: string;
      existing_lead_name: string;
    } & {
      [key: string]: unknown;
    };
    FollowUpState: "none" | "overdue" | "today" | "upcoming";
    FollowUpsRead: {
      overdue: components["schemas"]["LeadRead"][];
      today: components["schemas"]["LeadRead"][];
    };
    HealthRead: {
      status: "ok";
      database: "ok";
    };
    LastNoteRead: {
      preview: string;
      occurred_at: string;
    };
    LeadCreate: {
      name: string;
      company?: string | null;
      phone?: string | null;
    };
    LeadPage: {
      items: components["schemas"]["LeadRead"][];
      next_cursor: string | null;
    };
    LeadRead: {
      id: string;
      name: string;
      company: string | null;
      phone: string | null;
      status: components["schemas"]["LeadStatus"];
      next_follow_up_at: string | null;
      follow_up_state: components["schemas"]["FollowUpState"];
      is_stale: boolean;
      idle_days: number;
      last_note: components["schemas"]["LastNoteRead"] | null;
      last_activity_at: string;
      created_at: string;
      updated_at: string;
    };
    LeadStatsRead: {
      total: number;
      by_status: components["schemas"]["StatusCounts"];
      overdue: number;
      due_today: number;
    };
    LeadStatus: "new" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost";
    LeadUpdate: {
      name?: string | null;
      company?: string | null;
      phone?: string | null;
      status?: components["schemas"]["LeadStatus"] | null;
    };
    NoteCreate: {
      body: string;
      follow_up_at?: string | null;
    };
    NoteCreatedRead: {
      activity: components["schemas"]["ActivityRead"];
      lead: components["schemas"]["LeadRead"];
    };
    Problem: {
      type: string;
      title: string;
      status: number;
      detail: string;
      instance: string;
      request_id: string | null;
      errors: components["schemas"]["ProblemFieldError"][];
    } & {
      [key: string]: unknown;
    };
    ProblemFieldError: {
      field: string;
      message: string;
    };
    StatusCounts: {
      new: number;
      contacted: number;
      qualified: number;
      proposal_sent: number;
      won: number;
      lost: number;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  read_health: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HealthRead"];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  list_leads: {
    parameters: {
      query?: {
        status?: components["schemas"]["LeadStatus"] | null;
        q?: string | null;
        limit?: number;
        cursor?: string | null;
      };
      header?: {
        "x-timezone"?: string | null;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["LeadPage"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  create_lead: {
    parameters: {
      query?: never;
      header?: {
        "x-timezone"?: string | null;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LeadCreate"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["LeadRead"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["DuplicatePhoneProblem"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  list_follow_ups: {
    parameters: {
      query?: {
        status?: components["schemas"]["LeadStatus"] | null;
        q?: string | null;
      };
      header?: {
        "x-timezone"?: string | null;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FollowUpsRead"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  read_lead_stats: {
    parameters: {
      query?: {
        q?: string | null;
      };
      header?: {
        "x-timezone"?: string | null;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["LeadStatsRead"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  get_lead: {
    parameters: {
      query?: never;
      header?: {
        "x-timezone"?: string | null;
      };
      path: {
        lead_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["LeadRead"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  update_lead: {
    parameters: {
      query?: never;
      header?: {
        "x-timezone"?: string | null;
      };
      path: {
        lead_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LeadUpdate"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["LeadRead"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["DuplicatePhoneProblem"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  complete_follow_up: {
    parameters: {
      query?: never;
      header?: {
        "x-timezone"?: string | null;
      };
      path: {
        lead_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["LeadRead"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  list_activities: {
    parameters: {
      query?: {
        limit?: number;
        cursor?: string | null;
      };
      header?: never;
      path: {
        lead_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ActivityPage"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  log_note: {
    parameters: {
      query?: never;
      header?: {
        "x-timezone"?: string | null;
      };
      path: {
        lead_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["NoteCreate"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["NoteCreatedRead"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  get_activity: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        lead_id: string;
        activity_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ActivityRead"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
}
