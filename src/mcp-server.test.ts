import { describe, test, expect } from 'bun:test';
import { InMemoryChatHistory } from './utils/in-memory-chat-history.js';

describe('MCP session management', () => {
  test('InMemoryChatHistory stores and retrieves turns', () => {
    const history = new InMemoryChatHistory('test-model');
    history.saveUserQuery('What is the stock price of AAPL?');

    expect(history.hasMessages()).toBe(true);
    expect(history.getUserMessages()).toEqual(['What is the stock price of AAPL?']);
  });

  test('InMemoryChatHistory supports multiple turns', () => {
    const history = new InMemoryChatHistory('test-model');
    history.saveUserQuery('Query 1');
    history.saveUserQuery('Query 2');

    const messages = history.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0].query).toBe('Query 1');
    expect(messages[1].query).toBe('Query 2');
  });

  test('separate sessions are isolated', () => {
    const session1 = new InMemoryChatHistory('test-model');
    const session2 = new InMemoryChatHistory('test-model');

    session1.saveUserQuery('Session 1 query');
    session2.saveUserQuery('Session 2 query');

    expect(session1.getUserMessages()).toEqual(['Session 1 query']);
    expect(session2.getUserMessages()).toEqual(['Session 2 query']);
  });
});
