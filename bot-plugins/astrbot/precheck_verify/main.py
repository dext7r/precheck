"""
AstrBot 插件：QQ 群验证码生成器
用户发送 /验证码 即可获取访问网站的验证码
"""

import os
import aiohttp
from astrbot.api.event import filter, AstrMessageEvent
from astrbot.api.star import Context, Star, register

# 配置 - 请根据实际情况修改
# API_URL: 你的 precheck 网站地址 + /api/qq-bot/generate-code
# BOT_SECRET: 需要与网站环境变量 QQ_BOT_SECRET 保持一致
API_URL = os.getenv("PRECHECK_API_URL", "http://localhost:3000/api/qq-bot/generate-code")
BOT_SECRET = os.getenv("PRECHECK_BOT_SECRET", "")


@register("precheck_verify", "precheck", "QQ群验证码生成插件", "1.0.0", "")
class PrecheckVerifyPlugin(Star):
    """QQ 群验证码插件 - 用户发送 /验证码 获取验证码"""

    def __init__(self, context: Context):
        super().__init__(context)
        self.api_url = API_URL
        self.bot_secret = BOT_SECRET

        if not self.bot_secret:
            self.context.logger.warning(
                "PRECHECK_BOT_SECRET 未设置，请在环境变量中配置"
            )

    @filter.command("验证码")
    async def get_verify_code(self, event: AstrMessageEvent):
        """
        获取验证码
        用法: /验证码
        """
        if not self.bot_secret:
            yield event.plain_result("插件未正确配置，请联系管理员")
            return

        # 获取发送者信息
        sender_qq = str(event.get_sender_id())
        sender_name = event.get_sender_name() or sender_qq

        # 尝试获取群ID，如果失败则使用 "private"
        try:
            group_id = str(event.message_obj.group_id) if hasattr(event.message_obj, 'group_id') and event.message_obj.group_id else "private"
        except:
            group_id = "private"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    json={
                        "qqNumber": sender_qq,
                        "groupId": group_id,
                        "nickname": sender_name,
                    },
                    headers={
                        "Content-Type": "application/json",
                        "X-Bot-Secret": self.bot_secret,
                    },
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        code = data.get("code")
                        expires_in = data.get("expiryMinutes", 3)

                        reply = (
                            f"你的验证码是: {code}\n"
                            f"有效期 {expires_in} 分钟\n"
                            f"请在网站输入验证码完成验证"
                        )
                        yield event.plain_result(reply)

                    elif resp.status == 429:
                        data = await resp.json()
                        retry_after = data.get("retryAfter", 60)
                        yield event.plain_result(f"请求太频繁，请 {retry_after} 秒后再试")

                    elif resp.status == 503:
                        yield event.plain_result("服务未配置，请联系管理员")

                    else:
                        yield event.plain_result("验证码生成失败，请稍后再试")

        except aiohttp.ClientError as e:
            self.context.logger.error(f"API 请求失败: {e}")
            yield event.plain_result("服务暂时不可用，请稍后再试")
        except Exception as e:
            self.context.logger.error(f"处理消息时出错: {e}")
            yield event.plain_result("发生错误，请稍后再试")
