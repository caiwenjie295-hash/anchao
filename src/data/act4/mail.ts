import { mailById } from "../mailData";

const protagonistMail = mailById.get("MAIL_A1_C_001");
if (!protagonistMail) throw new Error("第一幕小 A 旧邮件缺失");

export const act4OldMails = [
  {
    id: "protagonist",
    label: "主角收到",
    from: protagonistMail.fromName,
    subject: protagonistMail.subject,
    sentAt: protagonistMail.sentAt,
    body: protagonistMail.body,
  },
  {
    id: "xiaoyue",
    label: "小月收到",
    from: "小 A",
    subject: "我要出门一趟",
    sentAt: "2020-04-19T23:41:00+08:00",
    body: "我要出门一趟，可能要过一段时间才回来。\n不要担心。\n定位：Z 省 X 市 XX 县",
  },
] as const;
