/**
 * Quiz Fusion Quest — Core Parser & Merger Engine
 * Directly ported from TXT MIXER.html for Telegram Bot & Vercel
 */

function detectBlocks(text) {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const regex = /^Q\.?\d+[.)]/gm;
  const matches = [...text.matchAll(regex)];
  const blocks = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const block = text.slice(start, end).trim();
    if (block) blocks.push(block);
  }
  return blocks;
}

function splitStem(stemRaw) {
  const emojiRegex = /([1-9])\uFE0F?\u20E3\s*/g;
  if (emojiRegex.test(stemRaw)) {
    emojiRegex.lastIndex = 0;
    const replaced = stemRaw.replace(emojiRegex, (m, d) => '\n' + d + '. ');
    return replaced.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  }
  const stmtRegex = /(Statement-[IVX]+:)\s*/g;
  if (stmtRegex.test(stemRaw)) {
    stmtRegex.lastIndex = 0;
    const replaced = stemRaw.replace(stmtRegex, (m, g1) => '\n' + g1 + ' ');
    return replaced.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  }
  return [stemRaw];
}

function parseBlock(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const headerMatch = lines[0].match(/^Q\.?\d+[.)]\s*/);
  const restOfLine0 = headerMatch ? lines[0].slice(headerMatch[0].length).trim() : lines[0];
  const sepIndex = lines.findIndex(l => l === '😂');

  let stemLines, options, exLine, isFormatA;

  if (sepIndex !== -1) {
    isFormatA = true;
    stemLines = [restOfLine0, ...lines.slice(1, sepIndex)];
    const rest = lines.slice(sepIndex + 1);
    const exIdx = rest.findIndex(l => /^Ex[:.]/.test(l));
    options = exIdx === -1 ? rest : rest.slice(0, exIdx);
    exLine = exIdx === -1 ? '' : rest.slice(exIdx).join(' ');
  } else {
    isFormatA = false;
    const exIdx = lines.findIndex((l, idx) => idx > 0 && /^Ex[:.]/.test(l));
    options = exIdx === -1 ? lines.slice(1) : lines.slice(1, exIdx);
    exLine = exIdx === -1 ? '' : lines.slice(exIdx).join(' ');
    stemLines = splitStem(restOfLine0);
  }
  return { stemLines, options, exLine, isFormatA };
}

function buildQuestionText(qObj, number) {
  const out = [];
  out.push('Q' + number + '. ' + qObj.stemLines[0]);
  for (let i = 1; i < qObj.stemLines.length; i++) out.push(qObj.stemLines[i]);
  out.push('😂');
  for (const opt of qObj.options) out.push(opt);
  if (qObj.exLine) out.push(qObj.exLine);
  return out.join('\n');
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Merges multiple files into a single standardized quiz text
 * @param {Array<{ name: string, content: string }>} files
 * @param {boolean} shuffleQuestions
 * @param {boolean} shuffleOptions
 */
function fuseFiles(files, shuffleQuestions = false, shuffleOptions = false) {
  let combinedItems = [];
  let fileMeta = files.map(f => ({
    name: f.name,
    count: 0,
    formatIsA: null,
    numbers: []
  }));

  for (let i = 0; i < files.length; i++) {
    const text = files[i].content || '';
    const blocks = detectBlocks(text);
    fileMeta[i].count = blocks.length;
    if (blocks.length > 0) {
      fileMeta[i].formatIsA = blocks[0].split('\n').some(l => l.trim() === '😂');
    }
    for (const block of blocks) {
      combinedItems.push({ block, fileIdx: i });
    }
  }

  if (shuffleQuestions) {
    combinedItems = shuffleArray(combinedItems);
  }

  let outputBlocks = [];
  let counter = 0;

  for (const item of combinedItems) {
    counter++;
    let parsed;
    try {
      parsed = parseBlock(item.block);
    } catch (err) {
      parsed = { stemLines: ['[Parse warning: could not fully read this question block]'], options: [], exLine: '' };
    }
    if (shuffleOptions && parsed.options && parsed.options.length > 1) {
      parsed.options = shuffleArray(parsed.options);
    }
    outputBlocks.push(buildQuestionText(parsed, counter));
    fileMeta[item.fileIdx].numbers.push(counter);
  }

  const mergedText = outputBlocks.join('\n\n') + (outputBlocks.length ? '\n' : '');
  const totalQuestions = counter;
  const level = Math.max(1, Math.ceil(totalQuestions / 100));

  return {
    mergedText,
    totalQuestions,
    fileMeta,
    level,
    shuffleQuestions,
    shuffleOptions
  };
}

module.exports = {
  detectBlocks,
  splitStem,
  parseBlock,
  buildQuestionText,
  shuffleArray,
  fuseFiles
};
