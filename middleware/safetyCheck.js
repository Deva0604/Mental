function safetyCheck(message) {
  const dangerWords = ["suicide", "kill myself", "end my life", "die", "hurt myself", "self-harm", "want to die", "better off dead", "no point living"];
  return dangerWords.some(word => message.toLowerCase().includes(word));
}

module.exports = { safetyCheck };