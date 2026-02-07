export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Precheck API",
    version: "1.0.0",
    description: "预申请系统 API 文档",
  },
  servers: [{ url: "/api", description: "API Server" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        description: "API Token (pk_...)",
      },
      cookieAuth: {
        type: "apiKey" as const,
        in: "cookie" as const,
        name: "session_token",
      },
    },
  },
  tags: [
    { name: "Auth", description: "认证相关" },
    { name: "Admin", description: "管理员接口" },
    { name: "Dashboard", description: "用户控制台" },
    { name: "PreApplication", description: "预申请" },
    { name: "Public", description: "公开接口" },
    { name: "Tickets", description: "工单系统" },
    { name: "Chat", description: "工单消息" },
  ],
  paths: {
    // ── Auth ──
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "登录",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "登录成功" },
          "401": { description: "凭据无效" },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "注册新用户",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "注册成功" },
          "400": { description: "参数错误" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "登出",
        responses: {
          "200": { description: "登出成功" },
        },
      },
    },
    "/auth/session": {
      get: {
        tags: ["Auth"],
        summary: "获取当前会话",
        responses: {
          "200": { description: "会话信息" },
          "401": { description: "未登录" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "获取当前用户信息",
        responses: {
          "200": { description: "用户信息" },
          "401": { description: "未登录" },
        },
      },
    },

    // ── Admin ──
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "用户列表",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "role", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "用户列表" },
          "401": { description: "未认证" },
          "403": { description: "无权限" },
        },
      },
    },
    "/admin/users/{id}": {
      put: {
        tags: ["Admin"],
        summary: "更新用户角色/状态",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  role: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "更新成功" },
          "404": { description: "用户不存在" },
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "删除用户",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "删除成功" },
          "404": { description: "用户不存在" },
        },
      },
    },
    "/admin/posts": {
      get: {
        tags: ["Admin"],
        summary: "文章审核列表",
        responses: {
          "200": { description: "文章列表" },
          "403": { description: "无权限" },
        },
      },
    },
    "/admin/posts/{id}": {
      put: {
        tags: ["Admin"],
        summary: "更新文章状态",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "更新成功" },
          "404": { description: "文章不存在" },
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "删除文章",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "删除成功" },
          "404": { description: "文章不存在" },
        },
      },
    },
    "/admin/pre-applications": {
      get: {
        tags: ["Admin"],
        summary: "预申请列表",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": { description: "预申请列表" },
          "403": { description: "无权限" },
        },
      },
    },
    "/admin/pre-applications/{id}/review": {
      put: {
        tags: ["Admin"],
        summary: "审核预申请",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["approved", "rejected"] },
                  reason: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "审核完成" },
          "404": { description: "申请不存在" },
        },
      },
    },
    "/admin/messages": {
      get: {
        tags: ["Admin"],
        summary: "站内信列表",
        responses: {
          "200": { description: "消息列表" },
          "403": { description: "无权限" },
        },
      },
      post: {
        tags: ["Admin"],
        summary: "创建站内信",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  recipientIds: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "创建成功" },
          "400": { description: "参数错误" },
        },
      },
    },
    "/admin/messages/{id}": {
      put: {
        tags: ["Admin"],
        summary: "更新站内信",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "更新成功" },
          "404": { description: "消息不存在" },
        },
      },
    },
    "/admin/messages/{id}/revoke": {
      post: {
        tags: ["Admin"],
        summary: "撤回站内信",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "撤回成功" },
          "404": { description: "消息不存在" },
        },
      },
    },
    "/admin/invite-codes": {
      get: {
        tags: ["Admin"],
        summary: "邀请码列表",
        responses: {
          "200": { description: "邀请码列表" },
          "403": { description: "无权限" },
        },
      },
      post: {
        tags: ["Admin"],
        summary: "创建/导入邀请码",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  codes: { type: "array", items: { type: "string" } },
                  count: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "创建成功" },
          "400": { description: "参数错误" },
        },
      },
    },
    "/admin/settings": {
      get: {
        tags: ["Admin"],
        summary: "获取站点设置",
        responses: {
          "200": { description: "站点设置" },
          "403": { description: "无权限" },
        },
      },
      put: {
        tags: ["Admin"],
        summary: "更新站点设置",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        },
        responses: {
          "200": { description: "更新成功" },
          "400": { description: "参数错误" },
        },
      },
    },
    "/admin/system-config": {
      get: {
        tags: ["Admin"],
        summary: "获取系统配置",
        responses: {
          "200": { description: "系统配置" },
          "403": { description: "无权限" },
        },
      },
      put: {
        tags: ["Admin"],
        summary: "更新系统配置",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        },
        responses: {
          "200": { description: "更新成功" },
          "400": { description: "参数错误" },
        },
      },
    },
    "/admin/stats": {
      get: {
        tags: ["Admin"],
        summary: "控制台统计数据",
        responses: {
          "200": { description: "统计数据" },
          "403": { description: "无权限" },
        },
      },
    },
    "/admin/api-tokens": {
      get: {
        tags: ["Admin"],
        summary: "API Token 列表",
        responses: {
          "200": { description: "Token 列表" },
          "403": { description: "无权限" },
        },
      },
      post: {
        tags: ["Admin"],
        summary: "创建 API Token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  expiresAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "创建成功" },
          "400": { description: "参数错误" },
        },
      },
    },
    "/admin/api-tokens/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "撤销 API Token",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "撤销成功" },
          "404": { description: "Token 不存在" },
        },
      },
    },
    "/admin/audit-logs": {
      get: {
        tags: ["Admin"],
        summary: "审计日志列表",
        responses: {
          "200": { description: "审计日志" },
          "403": { description: "无权限" },
        },
      },
    },
    "/admin/email-logs": {
      get: {
        tags: ["Admin"],
        summary: "邮件日志列表",
        responses: {
          "200": { description: "邮件日志" },
          "403": { description: "无权限" },
        },
      },
    },

    // ── Dashboard ──
    "/dashboard/posts": {
      get: {
        tags: ["Dashboard"],
        summary: "用户文章列表",
        responses: {
          "200": { description: "文章列表" },
          "401": { description: "未认证" },
        },
      },
      post: {
        tags: ["Dashboard"],
        summary: "创建文章",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "创建成功" },
          "400": { description: "参数错误" },
        },
      },
    },
    "/dashboard/posts/{id}": {
      put: {
        tags: ["Dashboard"],
        summary: "更新文章",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "更新成功" },
          "404": { description: "文章不存在" },
        },
      },
      delete: {
        tags: ["Dashboard"],
        summary: "删除文章",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "删除成功" },
          "404": { description: "文章不存在" },
        },
      },
    },
    "/dashboard/profile": {
      put: {
        tags: ["Dashboard"],
        summary: "更新个人资料",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  avatar: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "更新成功" },
          "401": { description: "未认证" },
        },
      },
    },
    "/dashboard/password": {
      put: {
        tags: ["Dashboard"],
        summary: "修改密码",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["oldPassword", "newPassword"],
                properties: {
                  oldPassword: { type: "string" },
                  newPassword: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "修改成功" },
          "400": { description: "旧密码错误" },
        },
      },
    },
    "/dashboard/messages": {
      get: {
        tags: ["Dashboard"],
        summary: "用户站内信列表",
        responses: {
          "200": { description: "消息列表" },
          "401": { description: "未认证" },
        },
      },
    },
    "/dashboard/messages/summary": {
      get: {
        tags: ["Dashboard"],
        summary: "未读消息数",
        responses: {
          "200": { description: "未读数量" },
          "401": { description: "未认证" },
        },
      },
    },
    "/dashboard/messages/{id}/read": {
      put: {
        tags: ["Dashboard"],
        summary: "标记已读",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "标记成功" },
          "404": { description: "消息不存在" },
        },
      },
    },

    // ── PreApplication ──
    "/pre-application": {
      get: {
        tags: ["PreApplication"],
        summary: "获取预申请记录",
        responses: {
          "200": { description: "预申请记录" },
          "401": { description: "未认证" },
        },
      },
      post: {
        tags: ["PreApplication"],
        summary: "提交预申请",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string" },
                  inviteCode: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "提交成功" },
          "400": { description: "参数错误" },
          "500": { description: "服务器错误" },
        },
      },
      put: {
        tags: ["PreApplication"],
        summary: "更新/重新提交预申请",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string" },
                  inviteCode: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "更新成功" },
          "400": { description: "参数错误" },
        },
      },
    },

    // ── Public ──
    "/public/system-config": {
      get: {
        tags: ["Public"],
        summary: "获取公开系统配置",
        responses: {
          "200": { description: "系统配置" },
        },
      },
    },
    "/public/invite-code-config": {
      get: {
        tags: ["Public"],
        summary: "获取邀请码配置",
        responses: {
          "200": { description: "邀请码配置" },
        },
      },
    },

    // ── Tickets ──
    "/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "工单列表",
        responses: {
          "200": { description: "工单列表" },
          "401": { description: "未认证" },
        },
      },
      post: {
        tags: ["Tickets"],
        summary: "创建工单",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  category: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "创建成功" },
          "400": { description: "参数错误" },
        },
      },
    },
    "/tickets/{id}": {
      get: {
        tags: ["Tickets"],
        summary: "工单详情",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "工单详情" },
          "404": { description: "工单不存在" },
        },
      },
    },
    "/tickets/{id}/messages": {
      post: {
        tags: ["Chat"],
        summary: "发送工单消息",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "发送成功" },
          "400": { description: "参数错误" },
          "404": { description: "工单不存在" },
        },
      },
    },
  },
}
