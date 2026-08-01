/**
 * Verification test for Quiz Fusion parser & merger
 */
const { fuseFiles } = require('./src/parser');

const sampleFile1 = `Q1. What is the capital of France?
😂
a) London
b) Paris
c) Berlin
Ex: Paris is the capital and most populous city of France.

Q2. What is 2 + 2?
😂
a) 3
b) 4
c) 5`;

const sampleFile2 = `Q1. Which planet is known as the Red Planet? 1️⃣ Earth 2️⃣ Mars 3️⃣ Jupiter
Q2. What is H2O? 1️⃣ Hydrogen 2️⃣ Water 3️⃣ Oxygen`;

const files = [
  { name: 'general_knowledge.txt', content: sampleFile1 },
  { name: 'science_quiz.txt', content: sampleFile2 }
];

const result = fuseFiles(files, false, false);
console.log('--- TEST RESULTS ---');
console.log('Total Merged Questions:', result.totalQuestions);
console.log('Level:', result.level);
console.log('File Meta:', JSON.stringify(result.fileMeta, null, 2));
console.log('--- MERGED OUTPUT PREVIEW ---');
console.log(result.mergedText);

if (result.totalQuestions === 4 && result.mergedText.includes('Q1.') && result.mergedText.includes('Q4.')) {
  console.log('✅ TEST PASSED SUCCESSFULLY!');
} else {
  console.error('❌ TEST FAILED!');
  process.exit(1);
}
