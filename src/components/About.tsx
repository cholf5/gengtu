import { useEffect } from 'react';
import { Button, Card, Space, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics/react';

interface AboutProps {
  onBack: () => void;
  onOpenCreate: () => void;
}

// 拆成片段 + 字符码，运行时拼。源码里搜不到完整字符串，挡掉常见正则爬虫。
const EMAIL_USER = ['cho', 'lf', '5'].join('');
const EMAIL_HOST = String.fromCharCode(104, 111, 116, 109, 97, 105, 108) + '.com'; // hotmail.com

const buildMailto = () => {
  const addr = `${EMAIL_USER}@${EMAIL_HOST}`;
  const subject = encodeURIComponent('[梗图铺投稿] ');
  const body = encodeURIComponent(
    [
      '模板名：',
      '',
      '附件清单（请一并附上）：',
      '  1. 底图：PNG / JPG，建议宽边 ≥ 600px',
      '  2. 模板 JSON：在「Create template」页面配好文字框后，点右侧「Generated JSON」卡片的 Download 得到的文件',
      '',
      '素材说明（来源 / 是否可公开使用）：',
      '',
      '其他备注（可选）：',
    ].join('\n'),
  );
  return `mailto:${addr}?subject=${subject}&body=${body}`;
};

// 用户可读但难以被爬虫整段匹配的提示形态。
const EMAIL_DISPLAY = `${EMAIL_USER} [at] ${EMAIL_HOST.replace('.', ' · ')}`;

export function About({ onOpenCreate }: AboutProps) {
  // 首屏按 hash 滚到对应区块；空 hash 时正常顶到「关于本站」。
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleSubmitClick = () => {
    track('submit_template_click');
    window.location.href = buildMailto();
  };

  return (
    <section className="about-page" aria-labelledby="about-heading">
      <Typography.Title level={3} id="about-heading" style={{ marginTop: 0 }}>
        关于
      </Typography.Title>

      <Space direction="vertical" size={24} style={{ display: 'flex' }}>
        <Card id="about-site" title="关于本站">
          <Typography.Paragraph style={{ marginBottom: 12 }}>
            梗图铺是我自己用着顺手做的小工具。
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 12 }}>
            平时我常在 imgflip 上拼图，但那里几乎没有国内流行的表情包模板 ——
            同志快醒醒、你尽管——算我输、狂粉、支持——最棒——冲啊……每次都要自己找图、对位、画框，挺折腾。
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 12 }}>
            于是干脆做了这个站：单人策展，模板都是我手挑的，不开放上传，不用登录，没有后端。打开就能用，做完图直接下载，没有水印，没有广告。
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 12 }}>
            如果你也常用 imgflip，希望梗图铺能补上那块中文模板的空白。
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
            另：部分界面是英文的，纯粹是我个人习惯（Unity / Figma 用多了，看英文 UI 更顺），不打算做多语言切换。
            <br />
            This is a personal curator-style meme generator. UI is in English by author preference.
          </Typography.Paragraph>
        </Card>

        <Card id="submit" title="提交模板">
          <Typography.Paragraph style={{ marginBottom: 12 }}>
            想看到的梗图模板这里没有？欢迎投稿。为了我能直接收下、立刻上线，请先在站内
            <Typography.Link onClick={onOpenCreate}> 「Create template」 </Typography.Link>
            页里配好文字框、导出 JSON，再把底图和 JSON 一起发邮件给我。
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 8 }}>具体步骤：</Typography.Paragraph>
          <ol style={{ margin: '0 0 16px', paddingLeft: 20, lineHeight: 1.9 }}>
            <li>
              打开 <Typography.Link onClick={onOpenCreate}>Create template</Typography.Link>
              ，上传底图（PNG / JPG，建议宽边 ≥ 600px），起个模板名，加 2–3 个标签。
            </li>
            <li>在预览图上拖出文字框、调好默认字号 / 颜色 / 对齐。</li>
            <li>
              在右侧「Generated JSON」卡片点 <strong>Download</strong>，把得到的{' '}
              <code>.json</code> 文件和底图一起作为附件发邮件给我。
            </li>
            <li>顺手附一句素材说明（来源、是否可公开使用），就齐活了。</li>
          </ol>
          <Space wrap size={12} align="center">
            <Button type="primary" icon={<MailOutlined />} onClick={handleSubmitClick}>
              邮件投稿
            </Button>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {EMAIL_DISPLAY}
            </Typography.Text>
          </Space>
        </Card>

        <Card id="author" title="关于作者">
          <Typography.Paragraph style={{ marginBottom: 12 }}>
            我是 cholf5，独立开发者，平时也做点小工具自用。
          </Typography.Paragraph>
          <Button
            href="https://x.com/cholf5"
            target="_blank"
            rel="noreferrer noopener"
          >
            𝕏 @cholf5
          </Button>
        </Card>

        <Card id="dev" title="开发过程">
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            本站从 0 到上线没有一行代码出自我之手 —— 全程交给 Claude Code（ark-code-latest
            模型）来写，累计消耗约 1 亿 token，缓存命中率 90.67%。技术栈：React + TypeScript + Vite +
            Ant Design。
          </Typography.Paragraph>
        </Card>
      </Space>
    </section>
  );
}
