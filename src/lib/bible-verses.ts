export const BIBLE_VERSES = [
  { text: "Do you not know that your bodies are temples of the Holy Spirit?", ref: "1 Corinthians 6:19" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "Physical training is of some value, but godliness has value for all things.", ref: "1 Timothy 4:8" },
  { text: "So whether you eat or drink or whatever you do, do it all for the glory of God.", ref: "1 Corinthians 10:31" },
  { text: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.", ref: "Psalm 28:7" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged.", ref: "Joshua 1:9" },
  { text: "But those who hope in the Lord will renew their strength.", ref: "Isaiah 40:31" },
  { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
  { text: "Commit to the Lord whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
  { text: "For God gave us a spirit not of fear but of power and love and self-control.", ref: "2 Timothy 1:7" },
  { text: "The Lord is my light and my salvation—whom shall I fear?", ref: "Psalm 27:1" },
  { text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" },
  { text: "Be on your guard; stand firm in the faith; be courageous; be strong.", ref: "1 Corinthians 16:13" },
  { text: "The joy of the Lord is your strength.", ref: "Nehemiah 8:10" },
  { text: "No discipline seems pleasant at the time, but later it produces a harvest of righteousness.", ref: "Hebrews 12:11" },
];

export function getRandomVerse() {
  return BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)];
}
