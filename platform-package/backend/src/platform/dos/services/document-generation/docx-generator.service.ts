// @ts-nocheck
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table,
  TableRow, TableCell, WidthType, AlignmentType, _BorderStyle,
  Header, Footer, PageNumber, _NumberFormat,
} from 'docx';
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

export interface DocxSection {
  heading?: string;
  headingLevel?: 'HEADING_1' | 'HEADING_2' | 'HEADING_3';
  paragraphs?: string[];
  table?: { headers: string[]; rows: string[][] };
}

export async function generateDocx(
  title: string,
  sections: DocxSection[],
  options?: { author?: string; subject?: string; rtl?: boolean },
): Promise<Buffer> {
  try {
    const children: Paragraph[] = [];

    children.push(new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: options?.rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: options?.rtl,
    }));

    for (const section of sections) {
      if (section.heading) {
        const level = section.headingLevel === 'HEADING_3' ? HeadingLevel.HEADING_3
          : section.headingLevel === 'HEADING_2' ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_1;
        children.push(new Paragraph({
          text: section.heading,
          heading: level,
          bidirectional: options?.rtl,
        }));
      }

      if (section.paragraphs) {
        for (const text of section.paragraphs) {
          children.push(new Paragraph({
            children: [new TextRun({ text, size: 24 })],
            bidirectional: options?.rtl,
          }));
        }
      }

      if (section.table) {
        const headerRow = new TableRow({
          children: section.table.headers.map(h => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 22 })] })],
            width: { size: Math.floor(100 / section.table!.headers.length), type: WidthType.PERCENTAGE },
          })),
        });

        const dataRows = section.table.rows.map(row => new TableRow({
          children: row.map(cell => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: cell, size: 22 })] })],
          })),
        }));

        children.push(new Paragraph({}));
        const _table = new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        });
        children.push(new Paragraph({}));
      }
    }

    const doc = new Document({
      creator: options?.author || 'Shahin-AI GRC',
      title,
      subject: options?.subject,
      sections: [{
        properties: {},
        headers: {
          default: new Header({
            children: [new Paragraph({ children: [new TextRun({ text: title, size: 18, italics: true })] })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })],
            })],
          }),
        },
        children,
      }],
    });

    return await Packer.toBuffer(doc) as Buffer;
  } catch (err: unknown) {
    logger.error('[DocxGenerator] Failed', { error: toErrorMessage(err) });
    throw err;
  }
}
