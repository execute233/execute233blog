---
title: "Anthropic Messages"
published: 2026-10-20
updated: 2026-10-20
verified: 2026-10-20
section: blog
description: "Anthropic Messages 的 HTTP、JSON、请求参数、内容块、工具调用与流式事件参考"
tags: [ Anthropic, API ]
category: "AI"
lang: "zh-CN"
tabGroup:
  slug: ai/llm/api
  title: "大模型 API 参考"
  id: anthropic-messages
  label: Anthropic Messages
  order: 2
---

## 创建 Message

`POST https://api.anthropic.com/v1/messages`

调用这个接口，提交对话消息，得到一条包含内容块数组的助手消息。系统指令放在顶层 `system`，常规对话放在 `messages`。

```http
POST /v1/messages HTTP/1.1
Host: api.anthropic.com
x-api-key: <ANTHROPIC_API_KEY>
anthropic-version: 2023-06-01
Content-Type: application/json

{
  "model": "claude-opus-5-5",
  "max_tokens": 1024,
  "system": "用中文简短回答。",
  "messages": [{"role": "user", "content": "什么是 HTTP？"}]
}
```

### 请求头

| 名称                          | 必填     | 说明                                                  |
|-----------------------------|--------|-----------------------------------------------------|
| `x-api-key`                 | 是      | Anthropic API 密钥                                    |
| `anthropic-version`         | 建议显式指定 | API 版本，示例使用 `2023-06-01`                            |
| `Content-Type`              | 是      | `application/json`                                  |
| `anthropic-beta`            | 否      | 特定 Beta 能力的标识                                       |
| `anthropic-workspace-id`    | 否      | 需要从多个 Workspace 中选择时使用；SDK 的 `workspace_id` 参数映射到此头 |
| `anthropic-user-profile-id` | 否      | 请求归属的用户档案，需要相应 Beta 权限；SDK 参数名为 `user_profile_id`   |

响应头里的 `request-id` 用于定位请求；限流信息见 `retry-after` 和 `anthropic-ratelimit-*`。

## 请求参数

### 必填字段

| 字段           | 类型       | 说明                                              |
|--------------|----------|-------------------------------------------------|
| `model`      | string   | 模型 ID                                           |
| `max_tokens` | integer  | 最大生成 token 数。模型可以提前结束；在支持缓存预热的配置里，也可以用 `0` 请求预热 |
| `messages`   | object[] | 对话消息，包含 `role` 与 `content`                      |

### 指令、生成与工具

| 字段               | 类型                | 说明                                                |
|------------------|-------------------|---------------------------------------------------|
| `system`         | string / object[] | 系统提示词，数组形式为文本块                                    |
| `stop_sequences` | string[]          | 自定义停止序列；命中时在响应中返回 `stop_reason` 与 `stop_sequence` |
| `stream`         | boolean           | 是否通过 SSE 增量返回                                     |
| `thinking`       | object            | 推理配置，支持的类型与默认行为由模型决定                              |
| `output_config`  | object            | 输出格式与 effort 配置                                   |
| `tools`          | object[]          | 客户端工具和服务端工具定义                                     |
| `tool_choice`    | object            | 自动选择、强制调用、指定工具或禁用工具                               |

### 缓存与执行配置

| 字段              | 类型            | 说明                                     |
|-----------------|---------------|----------------------------------------|
| `cache_control` | object / null | 顶层自动缓存控制，将标记应用到最后一个可缓存块                |
| `metadata`      | object        | 请求元数据，例如 `user_id`                     |
| `container`     | object / null | 容器引用与复用配置，适用于支持容器工具的请求                 |
| `diagnostics`   | object / null | 通过 `previous_message_id` 请求缓存差异诊断      |
| `inference_geo` | string / null | 推理处理区域；省略时使用 Workspace 默认配置            |
| `service_tier`  | string        | `auto` 或 `standard_only`，控制是否使用可用的优先容量 |
| `speed`         | string / null | `standard` 或 `fast`；部分模型需要相应 Beta 头    |

## 消息与内容块

### `messages[]`

常规对话使用 `user`、`assistant` 两种角色。`content` 可以是字符串，也可以是内容块数组；字符串等价于只有一个 `text` 块。

```json
[
  {
    "role": "user",
    "content": "你好，Claude。"
  },
  {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "你好。"
      }
    ]
  }
]
```

连续的同角色消息可能合并为同一轮；助手消息预填能不能用，取决于模型。

### 输入块目录

| `type`                                                                     | 主要字段                                                   | 说明                         |
|----------------------------------------------------------------------------|--------------------------------------------------------|----------------------------|
| `text`                                                                     | `text`、`cache_control`、可选 `citations`                  | 普通文本                       |
| `image`                                                                    | `source`、`cache_control`                               | 图片来源为 URL、base64 或受支持的文件引用 |
| `document`                                                                 | `source`、`title`、`context`、`citations`、`cache_control` | PDF、文本或其他受支持的文档来源          |
| `search_result`                                                            | `source`、`title`、`content`、引用设置                        | 调用方提供的检索结果，供引用与生成使用        |
| `thinking`                                                                 | `thinking`、`signature`                                 | 历史推理块，继续对话时应原样回传           |
| `redacted_thinking`                                                        | `data`                                                 | 已隐去的推理内容，回传时保留原值           |
| `tool_use`                                                                 | `id`、`name`、对象形式的 `input`                              | 助手要求客户端执行工具                |
| `tool_result`                                                              | `tool_use_id`、`content`、可选 `is_error`                  | 用户侧回传工具执行结果                |
| `server_tool_use`                                                          | 工具名称、标识和输入                                             | 服务端工具调用                    |
| `web_search_tool_result`、`web_fetch_tool_result`                           | 工具关联 ID、结果或错误                                          | 服务端搜索与抓取结果                 |
| `code_execution_tool_result`                                               | 代码执行结果或错误                                              | 由对应服务端工具产生                 |
| `bash_code_execution_tool_result`、`text_editor_code_execution_tool_result` | 终端或编辑器结果                                               | 按各自结果类型处理                  |
| `tool_search_tool_result`                                                  | 工具搜索结果                                                 | 返回按需加载的工具引用等内容             |
| `container_upload`                                                         | 上传到容器的文件引用                                             | 用于对应容器流程                   |

### 图片

```json
{
  "role": "user",
  "content": [
    {
      "type": "image",
      "source": {
        "type": "url",
        "url": "https://www.example.com/example.jpg"
      }
    },
    {
      "type": "text",
      "text": "描述这张图片。"
    }
  ]
}
```

base64 来源包含 `type: "base64"`、`media_type`、`data`。`data` 只放 base64 编码，不带 data URL 前缀。图片尺寸、数量和 MIME
类型受当前模型约束。

### 文档与引用

```json
{
  "type": "document",
  "source": {
    "type": "text",
    "media_type": "text/plain",
    "data": "HTTP 采用请求与响应的交互方式。"
  },
  "title": "HTTP 摘要",
  "citations": {
    "enabled": true
  }
}
```

文档来源还包括 URL PDF、base64 PDF、内容块和文件引用。引用位置可以是字符区间、页码、内容块区间或搜索结果位置，由
`citations[].type` 区分。

### 多轮消息

多轮消息要把模型看到的历史一起发过来。响应体里的 `id` 只是这条返回消息的标识，不能拿它自动恢复对话；继续工具轮次或服务端暂停的轮次时，把对应的助手内容按原始结构加回
`messages`。

```json
{
  "model": "claude-opus-5-5",
  "max_tokens": 1024,
  "system": "用中文简短回答。",
  "messages": [
    {
      "role": "user",
      "content": "什么是 HTTP？"
    },
    {
      "role": "assistant",
      "content": [
        {
          "type": "text",
          "text": "HTTP 是请求与响应协议。"
        }
      ]
    },
    {
      "role": "user",
      "content": "HTTPS 多了什么？"
    }
  ]
}
```

## 返回对象

<details>
<summary>查看返回 JSON 示例</summary>

```json
{
  "id": "msg_example",
  "type": "message",
  "role": "assistant",
  "model": "claude-opus-5-5",
  "content": [
    {
      "type": "text",
      "text": "HTTP 是客户端和服务器交换请求与响应的协议。"
    }
  ],
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 20,
    "output_tokens": 15
  }
}
```

</details>

### Message 字段

| 字段              | 类型            | 说明                        |
|-----------------|---------------|---------------------------|
| `id`            | string        | 消息标识                      |
| `type`          | string        | 固定为 `message`             |
| `role`          | string        | 固定为 `assistant`           |
| `model`         | string        | 使用的模型                     |
| `content`       | object[]      | 按类型区分的内容块，可以混合文本、工具调用和推理等 |
| `stop_reason`   | string / null | 结束原因；流式开始阶段可能为空           |
| `stop_sequence` | string / null | 实际命中的自定义停止序列              |
| `stop_details`  | object / null | 结束原因的额外结构化细节，例如拒绝信息       |
| `usage`         | object        | token、缓存、服务等级和工具用量        |
| `container`     | object / null | 本次使用的容器信息                 |
| `diagnostics`   | object / null | 请求开启诊断时的差异信息，未发现差异也可能为空   |

### `stop_reason`

| 值                               | 含义                      |
|---------------------------------|-------------------------|
| `end_turn`                      | 模型自然结束当前轮次              |
| `max_tokens`                    | 达到请求或模型的输出上限；内容可能未完成    |
| `stop_sequence`                 | 命中自定义停止序列               |
| `tool_use`                      | 需要处理工具调用                |
| `pause_turn`                    | 长任务暂停；按服务端工具的继续方式发送后续请求 |
| `refusal`                       | 模型拒绝请求                  |
| `model_context_window_exceeded` | 达到模型上下文限制               |

### 输出块

文本位于 `content` 数组的 `text` 块中。其他块包括 `thinking`、`redacted_thinking`、`tool_use`、`server_tool_use`
、搜索、抓取、代码执行和工具搜索结果等，按 `type` 解析。

### `usage`

| 字段                            | 说明                                     |
|-------------------------------|----------------------------------------|
| `input_tokens`                | 当前用量定义中的普通输入 token                     |
| `output_tokens`               | 输出 token 总量，包含相关推理用量，是计费用量的总口径         |
| `cache_creation_input_tokens` | 用于创建缓存的输入 token                        |
| `cache_read_input_tokens`     | 从缓存读取的输入 token                         |
| `cache_creation`              | 按缓存 TTL 区分的写入明细                        |
| `output_tokens_details`       | 输出分类明细，不应再次与 `output_tokens` 相加        |
| `server_tool_use`             | 服务端工具请求次数等                             |
| `service_tier`                | 实际服务等级，如 `standard`、`priority`、`batch` |
| `inference_geo`、`speed`       | 实际处理区域与速度模式                            |

总输入用量要把普通输入、缓存写入和缓存读取都算进去。

## 工具定义

### 客户端工具

```json
{
  "model": "claude-opus-5-5",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "杭州现在的天气如何？"
    }
  ],
  "tools": [
    {
      "name": "get_weather",
      "description": "查询指定城市的当前天气。",
      "input_schema": {
        "type": "object",
        "properties": {
          "city": {
            "type": "string"
          }
        },
        "required": [
          "city"
        ],
        "additionalProperties": false
      }
    }
  ],
  "tool_choice": {
    "type": "auto"
  }
}
```

| 工具字段                    | 必填 | 说明                             |
|-------------------------|----|--------------------------------|
| `name`                  | 是  | 工具名，与返回的 `tool_use.name` 对应    |
| `input_schema`          | 是  | 输入的 JSON Schema，根类型为对象         |
| `description`           | 否  | 描述工具用途、输入约束及使用条件               |
| `strict`                | 否  | 严格验证工具名称与输入，要求模型支持             |
| `type`                  | 否  | 自定义工具可使用 `custom`              |
| `cache_control`         | 否  | 工具定义的缓存断点                      |
| `defer_loading`         | 否  | 延迟加载，配合工具搜索                    |
| `allowed_callers`       | 否  | 允许直接调用或指定代码执行环境调用              |
| `input_examples`        | 否  | 示例输入对象数组                       |
| `eager_input_streaming` | 否  | 是否尽早流式发送输入参数，默认行为由相关 Beta 配置决定 |

### `tool_choice`

`{"type":"auto"}` 让模型选择；`{"type":"any"}` 要求调用工具；`{"type":"tool","name":"get_weather"}` 指定工具；
`{"type":"none"}` 禁用工具。支持相应配置时，可通过 `disable_parallel_tool_use` 禁止并行工具使用。

### `tool_use` 与 `tool_result`

模型的工具输入已经是 JSON 对象。客户端校验、执行后，把原助手块和工具结果一起加入历史，结果放在后续的 `user` 消息中。

```json
[
  {
    "role": "assistant",
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_weather_1",
        "name": "get_weather",
        "input": {
          "city": "杭州"
        }
      }
    ]
  },
  {
    "role": "user",
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_weather_1",
        "content": "{\"temperature_c\":22,\"condition\":\"晴\"}"
      }
    ]
  }
]
```

回传工具结果时，有几条顺序要求：

1. 工具结果要紧跟对应的工具调用；
2. 在同一条用户消息里，工具结果排在普通文本之前；
3. 并行调用的每个结果都要对应回传；
4. 历史推理块及其签名按原样回传。

工具失败时可以设置 `is_error: true`。

### 服务端工具目录

服务端工具以带版本的 `type` 选择 Schema，`name` 使用对应工具名。当前类型目录包含网页搜索、网页抓取、代码执行、Bash、文本编辑器、记忆、工具搜索以及浏览器或计算机工具集。

例如网页搜索类型 `web_search_20250305` 配合 `name: "web_search"`，还可包含使用次数、域名和位置配置。完整版本集合和字段见官方
`ToolUnionParam` 目录。

## 推理、结构化输出与缓存

### `thinking`

自适应模式的结构是 `{"type":"adaptive"}`。手动扩展推理使用 `{"type":"enabled","budget_tokens":2048}`，预算至少为
1024；模型是否接受、预算与 `max_tokens` 怎么配合，要按模型确认。关闭模式为 `{"type":"disabled"}`。

输出里可能带 `signature` 的 `thinking`，也可能是 `redacted_thinking`，继续对话时原样回传。

### `output_config`

`effort` 的类型包含 `low`、`medium`、`high`、`xhigh`、`max`，模型只接受其中一部分。JSON 输出格式放在 `format`：

```json
{
  "output_config": {
    "format": {
      "type": "json_schema",
      "schema": {
        "type": "object",
        "properties": {
          "city": {
            "type": "string"
          }
        },
        "required": [
          "city"
        ],
        "additionalProperties": false
      }
    }
  }
}
```

除了 JSON 本身，还要检查 `stop_reason`：达到 token 上限时，文本可能不是完整的 JSON。

### `cache_control` 与诊断

缓存标记的结构是 `{"type":"ephemeral"}`，可使用支持的 `ttl`（如 `5m`、`1h`
）。顶层标记自动作用于最后一个可缓存块，显式标记也可以放在文本、文档、系统块或工具定义等支持的位置。缓存命中还依赖模型、工具、系统提示和内容前缀是否一致。

`diagnostics` 可以包含 `previous_message_id`，用于比较前一次请求的缓存差异；它不会恢复那次对话。

## 流式事件

请求设置 `stream: true`。常见顺序为 `message_start`，随后多组内容块事件，再到 `message_delta` 与 `message_stop`。服务端还可能发送
`ping` 或错误。

```text
event: message_start
data: {"type":"message_start","message":{"id":"msg_example","type":"message","role":"assistant","model":"claude-opus-5-5","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":8,"output_tokens":1}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"你好"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":2}}

event: message_stop
data: {"type":"message_stop"}
```

### 事件对象

| 事件                    | 主要字段                         | 处理                 |
|-----------------------|------------------------------|--------------------|
| `message_start`       | `message`                    | 初始化消息和初始用量         |
| `content_block_start` | `index`、`content_block`      | 为索引创建内容块，保留类型和已有字段 |
| `content_block_delta` | `index`、`delta`              | 更新对应块，按增量类型解析      |
| `content_block_stop`  | `index`                      | 对应内容块结束            |
| `message_delta`       | `delta`、`usage`              | 更新结束原因和累计用量        |
| `message_stop`        | `type`                       | 消息流结束              |
| `ping`                | `type`                       | 保活，不追加到内容          |
| `error`               | `error.type`、`error.message` | 流内错误，不能当作正常结束      |

### `content_block_delta.delta`

| 类型                 | 增量字段           | 处理                    |
|--------------------|----------------|-----------------------|
| `text_delta`       | `text`         | 追加到文本块                |
| `input_json_delta` | `partial_json` | 追加字符串，工具块完整后再解析为 JSON |
| `thinking_delta`   | `thinking`     | 累计推理块内容               |
| `signature_delta`  | `signature`    | 保存推理签名                |
| `citations_delta`  | `citation`     | 为文本块追加引用              |

用 `index` 定位内容块，不能把所有增量拼成一个字符串。流里的用量是累计值，不要把每次 `message_delta.usage.output_tokens`再相加。

## 错误

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "The request is not valid."
  },
  "request_id": "req_example"
}
```

| HTTP 状态 | 错误类型                    | 检查方向                          |
|---------|-------------------------|-------------------------------|
| `400`   | `invalid_request_error` | 参数、消息结构、模型能力                  |
| `401`   | `authentication_error`  | API 密钥                        |
| `402`   | `billing_error`         | 账户计费状态与额度                     |
| `403`   | `permission_error`      | 资源或功能权限                       |
| `404`   | `not_found_error`       | 资源或模型是否存在且可访问                 |
| `413`   | `request_too_large`     | 请求体大小限制                       |
| `429`   | `rate_limit_error`      | 请求和 token 限速，结合 `retry-after` |
| `500`   | `api_error`             | 服务端内部错误                       |
| `529`   | `overloaded_error`      | 服务过载，有限次数退避重试                 |

## 参考文档

- [Messages API](https://platform.claude.com/docs/en/api/messages)
- [创建 Message](https://platform.claude.com/docs/en/api/messages/create)
- [流式消息](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [错误](https://platform.claude.com/docs/en/api/errors)
- [官方 SDK 生成参数，固定版本](https://github.com/anthropics/anthropic-sdk-python/blob/bcd55fe1d3f0f1240765f8cef04295b67337f55a/src/anthropic/types/message_create_params.py)
- [请求体与请求头映射](https://github.com/anthropics/anthropic-sdk-python/blob/bcd55fe1d3f0f1240765f8cef04295b67337f55a/src/anthropic/resources/messages/messages.py)
- [内容块目录](https://github.com/anthropics/anthropic-sdk-python/blob/bcd55fe1d3f0f1240765f8cef04295b67337f55a/src/anthropic/types/content_block_param.py)
- [工具变体目录](https://github.com/anthropics/anthropic-sdk-python/blob/bcd55fe1d3f0f1240765f8cef04295b67337f55a/src/anthropic/types/tool_union_param.py)
- [官方类型目录，同一版本](https://github.com/anthropics/anthropic-sdk-python/tree/bcd55fe1d3f0f1240765f8cef04295b67337f55a/src/anthropic/types)
