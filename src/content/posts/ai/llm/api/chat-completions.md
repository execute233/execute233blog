---
title: "OpenAI Chat Completions"
published: 2026-10-20
updated: 2026-10-20
verified: 2026-10-20
section: blog
description: "大模型 Chat Completions / Responses / Messages 调用接口格式参考"
tags: [ OpenAI, Anthropic, API ]
category: "AI"
lang: "zh-CN"
tabGroup:
  slug: ai/llm/api
  title: "大模型 API 参考"
  id: chat-completions
  label: Chat Completions
  order: 0
---

## 创建 Chat Completion

`POST https://api.openai.com/v1/chat/completions`

调用这个接口，根据 `messages` 中的对话生成下一条助手消息。多轮对话要把模型看到的历史一并放进 `messages`；响应里的 `id`
不能用来恢复上下文。可用的输入类型、工具和参数由 `model` 决定。

```http
POST /v1/chat/completions HTTP/1.1
Host: api.openai.com
Authorization: Bearer <OPENAI_API_KEY>
Content-Type: application/json

{
  "model": "gpt-6-astra",
  "messages": [
    {"role": "developer", "content": "用中文简短回答。"},
    {"role": "user", "content": "什么是 HTTP？"}
  ]
}
```

### 请求头

| 名称                    | 必填 | 说明                            |
|-----------------------|----|-------------------------------|
| `Authorization`       | 是  | `Bearer <API_KEY>` 形式的 API 密钥 |
| `Content-Type`        | 是  | `application/json`            |
| `OpenAI-Organization` | 否  | 指定组织，适用于密钥可访问多个组织的情况          |
| `OpenAI-Project`      | 否  | 指定项目                          |
| `X-Client-Request-Id` | 否  | 调用方生成的请求标识，用于关联日志，不等于幂等键      |

响应头中的 `x-request-id` 用于定位请求，限额信息见 `x-ratelimit-*`。

## 请求参数

### 必填字段

| 字段         | 类型       | 说明                 |
|------------|----------|--------------------|
| `model`    | string   | 模型 ID              |
| `messages` | object[] | 完整的对话消息列表；消息结构见下一节 |

### 生成与采样

| 字段                      | 类型                       | 说明                                                     |
|-------------------------|--------------------------|--------------------------------------------------------|
| `max_completion_tokens` | integer / null           | 生成 token 的上限，包含可见输出和推理 token                           |
| `temperature`           | number / null            | 采样温度，范围 `0` 到 `2`。通常只调整它或 `top_p` 中的一项                 |
| `top_p`                 | number / null            | 核采样的累计概率阈值                                             |
| `frequency_penalty`     | number / null            | 范围 `-2` 到 `2`，按已出现的频率影响重复 token                        |
| `presence_penalty`      | number / null            | 范围 `-2` 到 `2`，按 token 是否出现过影响后续生成                      |
| `stop`                  | string / string[] / null | 最多四个停止序列；命中序列不会出现在返回文本中。部分推理模型不支持                      |
| `n`                     | integer / null           | 为同一输入生成的候选数量，返回到 `choices`；费用与所有候选的生成量有关               |
| `logit_bias`            | object / null            | token ID 到偏置值的映射，偏置范围 `-100` 到 `100`                   |
| `logprobs`              | boolean / null           | 是否返回输出 token 的对数概率                                     |
| `top_logprobs`          | integer / null           | 每个位置返回的候选 token 数量，范围 `0` 到 `20`；要求 `logprobs: true`   |
| `seed`                  | integer / null           | Beta 参数，尽力复现采样结果；不能保证确定性，可结合 `system_fingerprint` 排查差异 |

### 输出、推理与工具

| 字段                    | 类型              | 说明                                                                         |
|-----------------------|-----------------|----------------------------------------------------------------------------|
| `modalities`          | string[] / null | 输出类型，例如 `["text"]` 或 `["text", "audio"]`                                   |
| `audio`               | object / null   | 音频输出的声音与格式。请求音频输出时需要配置                                                     |
| `response_format`     | object          | 文本、JSON 对象或 JSON Schema 输出约束                                               |
| `reasoning_effort`    | string / null   | 推理投入，可选值包括 `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`；模型只支持其中一部分 |
| `verbosity`           | string / null   | 输出详细程度：`low`、`medium`、`high`                                               |
| `prediction`          | object / null   | 预先提供大部分已知输出，适用于支持 Predicted Outputs 的模型                                    |
| `tools`               | object[]        | 函数工具或自定义文本工具的定义                                                            |
| `tool_choice`         | string / object | `none`、`auto`、`required`，或指定工具                                             |
| `parallel_tool_calls` | boolean         | 是否允许同一轮产生多个工具调用                                                            |
| `web_search_options`  | object          | 支持搜索的模型使用的搜索配置                                                             |
| `moderation`          | object / null   | 请求输入与输出的审核配置；包含审核 `model` 和可选 `policy`                                     |

### 流式、存储与缓存

| 字段                     | 类型             | 说明                                                                               |
|------------------------|----------------|----------------------------------------------------------------------------------|
| `stream`               | boolean / null | 为 `true` 时返回 SSE 流；返回对象的 `object` 从 `chat.completion` 变成 `chat.completion.chunk` |
| `stream_options`       | object / null  | 仅在 `stream: true` 时使用，例如请求流末尾的用量                                                 |
| `store`                | boolean / null | 是否存储本次 Chat Completion，受组织的数据策略约束                                                |
| `metadata`             | object / null  | 最多 16 组字符串键值；键最长 64 字符，值最长 512 字符                                                |
| `service_tier`         | string / null  | 处理等级，例如 `auto`、`default`、`flex`、`scale`、`priority`、`fast`，取决于项目权限                |
| `safety_identifier`    | string / null  | 稳定的最终用户标识，最长 128 字符；避免直接放姓名或邮箱                                                   |
| `prompt_cache_key`     | string / null  | 将相似请求归入缓存，不能用它代替对话历史                                                             |
| `prompt_cache_options` | object         | 新版提示缓存配置，包含 `mode` 与 `ttl`；仅适用于支持该配置的模型                                          |

### 已弃用或兼容字段

| 字段                       | 类型              | 当前对应字段                                                                 |
|--------------------------|-----------------|------------------------------------------------------------------------|
| `max_tokens`             | integer / null  | 使用 `max_completion_tokens`；不兼容部分推理模型                                   |
| `functions`              | object[]        | 使用 `tools`                                                             |
| `function_call`          | string / object | 使用 `tool_choice`                                                       |
| `user`                   | string          | 缓存归类使用 `prompt_cache_key`，用户安全标识使用 `safety_identifier`                 |
| `prompt_cache_retention` | string / null   | 旧缓存保留策略，值为 `in_memory` 或 `24h`；新版配置为 `prompt_cache_options.ttl`，两者语义不同 |

## 消息对象

### `messages[].role`

| 角色          | 用途              | 主要字段                                               |
|-------------|-----------------|----------------------------------------------------|
| `developer` | 开发者指令；是否支持取决于模型 | `content`、可选 `name`                                |
| `system`    | 系统指令            | `content`、可选 `name`                                |
| `user`      | 用户输入            | `content`、可选 `name`                                |
| `assistant` | 历史模型输出或工具调用     | `content`、`tool_calls`、`refusal`、`audio`、可选 `name` |
| `tool`      | 客户端工具执行结果       | `tool_call_id`、`content`                           |
| `function`  | 已弃用的函数结果角色      | `name`、`content`                                   |

`developer` 与 `system` 的内容可以是字符串或文本块数组。`user` 还可以包含图片、音频和文件块。`assistant` 发起工具调用时，
`content` 可以为空。

### 内容块

| `type`        | 主要结构                                                               | 说明                                                 |
|---------------|--------------------------------------------------------------------|----------------------------------------------------|
| `text`        | `{"type":"text","text":"你好"}`                                      | 普通文本                                               |
| `image_url`   | `{"type":"image_url","image_url":{"url":"…","detail":"auto"}}`     | 远程图片 URL 或含 base64 的 data URL；`detail` 取值受模型支持范围约束 |
| `input_audio` | `{"type":"input_audio","input_audio":{"data":"…","format":"wav"}}` | base64 音频；格式为 `wav` 或 `mp3`                        |
| `file`        | `{"type":"file","file":{"file_id":"file_…"}}`                      | 已上传文件，也可以按接口支持的方式提供 `file_data` 和 `filename`       |
| `refusal`     | `{"type":"refusal","refusal":"…"}`                                 | 助手消息中的拒绝内容                                         |

图片输入示例：

```json
[
  {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "描述这张图片。"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "https://www.example.com/example.jpg",
          "detail": "auto"
        }
      }
    ]
  }
]
```

### 多轮消息

多轮消息要把模型看到的历史一起发过来。响应体里的 `id` 只是本次返回的标识，不能拿它把旧对话自动接进新的请求。

```json
{
  "model": "gpt-6-astra",
  "messages": [
    {
      "role": "system",
      "content": "用中文简短回答。"
    },
    {
      "role": "user",
      "content": "什么是 HTTP？"
    },
    {
      "role": "assistant",
      "content": "HTTP 是客户端和服务器交换请求与响应的协议。"
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
  "id": "chatcmpl_example",
  "object": "chat.completion",
  "created": 1792454400,
  "model": "gpt-6-astra",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "HTTP 是客户端和服务器交换请求与响应的协议。",
        "refusal": null
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

</details>

### Chat Completion

| 字段                   | 类型            | 说明                    |
|----------------------|---------------|-----------------------|
| `id`                 | string        | 本次生成的标识               |
| `object`             | string        | 固定为 `chat.completion` |
| `created`            | integer       | Unix 秒级时间戳            |
| `model`              | string        | 实际使用的模型               |
| `choices`            | object[]      | 候选输出，按 `index` 区分     |
| `usage`              | object / null | token 计数与明细           |
| `service_tier`       | string / null | 实际处理等级，可能不同于请求值       |
| `system_fingerprint` | string / null | 后端配置指纹，不是模型内容的哈希      |
| `metadata`           | object / null | 附加元数据                 |
| `moderation`         | object / null | 请求审核时的输入、输出审核结果或审核错误  |

### `choices[]`

| 字段                      | 说明                                                  |
|-------------------------|-----------------------------------------------------|
| `index`                 | 候选序号                                                |
| `message.role`          | 生成消息的角色，通常是 `assistant`                             |
| `message.content`       | 文本内容或 `null`；工具调用场景不能只读取此字段                         |
| `message.tool_calls`    | 函数或自定义工具调用数组                                        |
| `message.refusal`       | 拒绝内容或 `null`                                        |
| `message.audio`         | 音频输出对象，包含 `id`、`data`、`expires_at`、`transcript`     |
| `message.annotations`   | 注解，例如搜索引用的 URL、标题与文本区间                              |
| `message.function_call` | 已弃用的旧式函数调用                                          |
| `logprobs`              | 文本或拒绝内容的 token 概率，含 `token`、`logprob`、`bytes` 和候选列表 |
| `finish_reason`         | 本候选结束的原因                                            |

`finish_reason`：`stop` 表示自然结束或命中停止序列；`length` 表示达到上限；`tool_calls` 表示需要处理工具调用；
`content_filter` 表示内容被过滤；`function_call` 是旧式工具结束原因。

### `usage`

| 字段                                                     | 说明                 |
|--------------------------------------------------------|--------------------|
| `prompt_tokens`                                        | 输入 token 数         |
| `completion_tokens`                                    | 生成 token 数         |
| `total_tokens`                                         | 输入与生成 token 总数     |
| `prompt_tokens_details.cached_tokens`                  | 输入中命中缓存的 token 数   |
| `prompt_tokens_details.audio_tokens`                   | 音频输入 token 数       |
| `completion_tokens_details.reasoning_tokens`           | 推理 token 数，属于生成用量  |
| `completion_tokens_details.audio_tokens`               | 音频输出 token 数       |
| `completion_tokens_details.accepted_prediction_tokens` | 预测输出中被接受的 token 数  |
| `completion_tokens_details.rejected_prediction_tokens` | 预测输出中未被采用的 token 数 |

## 工具调用

### 函数工具定义

`tools[].type` 为 `function`，函数定义放在 `tools[].function` 中。

```json
{
  "model": "gpt-6-astra",
  "messages": [
    {
      "role": "user",
      "content": "杭州现在的天气如何？"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "查询指定城市的当前天气。",
        "parameters": {
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
        },
        "strict": true
      }
    }
  ],
  "tool_choice": "auto"
}
```

`name` 是调用名称；`description` 用于说明用途；`parameters` 是 JSON Schema；`strict` 控制严格匹配，具体 Schema
需符合接口支持的子集。强制调用某个函数时，使用 `{"type":"function","function":{"name":"get_weather"}}`。

### 调用与回传

模型返回的 `arguments` 是字符串形式的 JSON，客户端负责解析、校验、执行工具，再回传结果。示例只展示 `messages`
的增量；实际请求还要保留之前的消息和工具定义。

```json
[
  {
    "role": "assistant",
    "content": null,
    "tool_calls": [
      {
        "id": "call_weather_1",
        "type": "function",
        "function": {
          "name": "get_weather",
          "arguments": "{\"city\":\"杭州\"}"
        }
      }
    ]
  },
  {
    "role": "tool",
    "tool_call_id": "call_weather_1",
    "content": "{\"temperature_c\":22,\"condition\":\"晴\"}"
  }
]
```

有多个调用时，每个 `tool_call_id` 都要对应其结果。

### 自定义文本工具

自定义工具使用 `{"type":"custom","custom":{"name":"…","description":"…","format":{"type":"text"}}}`。也可以通过 grammar
格式约束自由文本输入；返回调用的文本在 `custom.input` 中，而非 `function.arguments`。

## 格式化输出与高级配置

### `response_format`

`{"type":"text"}` 输出普通文本；`{"type":"json_object"}` 只约束 JSON 语法：

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "city_result",
    "strict": true,
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
```

Schema 正确也要检查 `refusal` 和结束原因。截断响应不能当作完整 JSON 使用。

### `audio`、`prediction` 与搜索

`audio` 包含 `voice` 与 `format`，格式包括 `wav`、`mp3`、`flac`、`opus`、`pcm16` 等已定义值，具体以音频模型为准。音频输出配合
`modalities` 使用。

`prediction` 的形式为 `{"type":"content","content":"已知的大部分输出"}`，`content` 也可以是文本块数组。

`web_search_options` 包含 `search_context_size`（`low`、`medium`、`high`）及可选 `user_location`。近似位置结构为
`{"type":"approximate","approximate":{"country":"CN","city":"杭州","timezone":"Asia/Shanghai"}}`；`approximate` 还可以包含
`region`。

### 缓存与审核

新版 `prompt_cache_options` 使用 `mode: "implicit" | "explicit"` 和 `ttl: "30m"`。显式缓存断点写在支持该能力的内容块上，是否支持及断点数量需与模型指南一并确认。
`prompt_cache_key` 只影响缓存归类，不传递历史消息。

`moderation` 的结构为`{"model":"omni-moderation-latest","policy":{"input":{"mode":"score"},"output":{"mode":"block"}}}`。
`score` 与 `block`的行为不同，不应把审核结果当成普通模型文本。

## 流式事件

请求设置 `stream: true`。若需要结束时的用量，增加 `"stream_options":{"include_usage":true}`。

每个 SSE `data` 事件是一份 `chat.completion.chunk`，通过空行分隔。下面省略与当前片段无关的可选字段：

```text
data: {"id":"chatcmpl_example","object":"chat.completion.chunk","created":1792454400,"model":"gpt-6-astra","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl_example","object":"chat.completion.chunk","created":1792454400,"model":"gpt-6-astra","choices":[{"index":0,"delta":{"content":"你好"},"finish_reason":null}]}

data: {"id":"chatcmpl_example","object":"chat.completion.chunk","created":1792454400,"model":"gpt-6-astra","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: {"id":"chatcmpl_example","object":"chat.completion.chunk","created":1792454400,"model":"gpt-6-astra","choices":[],"usage":{"prompt_tokens":8,"completion_tokens":2,"total_tokens":10}}

data: [DONE]
```

### chunk 拼接规则

| 字段                                      | 处理方式                               |
|-----------------------------------------|------------------------------------|
| `choices[].index`                       | 分开维护每个候选，不能把多个候选串成一份文本             |
| `delta.role`                            | 设置消息角色，通常只在开头出现                    |
| `delta.content`                         | 追加文本增量，允许为空或缺失                     |
| `delta.refusal`                         | 单独累计拒绝内容                           |
| `delta.tool_calls[].index`              | 同一候选内部的工具序号，用它定位待拼接调用              |
| `delta.tool_calls[].function.arguments` | 字符串增量，完整收到后再解析 JSON                |
| `finish_reason`                         | 标记对应候选结束，后面仍可能有用量事件                |
| `usage`                                 | 启用 `include_usage` 后的最终用量；断流时可能收不到 |

从网络读到的一段字节，不等于一个 SSE 事件。先缓冲到空行，拼好这一事件的所有 `data:` 行，再解析 JSON；`[DONE]` 是终止标记，不是
JSON。

## 错误

```json
{
  "error": {
    "message": "Invalid value for a request parameter.",
    "type": "invalid_request_error",
    "param": "messages",
    "code": "invalid_value"
  }
}
```

| HTTP 状态       | 检查方向                            |
|---------------|---------------------------------|
| `400`         | JSON、字段类型、模型参数支持范围、上下文长度        |
| `401`         | API 密钥是否有效                      |
| `403`         | 项目、组织或资源权限                      |
| `404`         | 模型或资源标识是否存在且可访问                 |
| `429`         | 请求速率、token 速率或额度；根据错误码区分，避免无限重试 |
| `500` / `503` | 服务端错误或繁忙，结合响应头进行有限次数退避重试        |

## 参考文档

- [Chat Completions 概览](https://developers.openai.com/api/reference/chat-completions/overview)
- [创建接口与嵌套字段](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
- [流式事件](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events)
- [官方 Python SDK 参数定义](https://github.com/openai/openai-python/blob/8968560fb926240aea5fed8ee24e189eade57118/src/openai/types/chat/completion_create_params.py)
- [官方 SDK 返回对象目录](https://github.com/openai/openai-python/tree/8968560fb926240aea5fed8ee24e189eade57118/src/openai/types/chat)
