import React from 'react';

interface Message {
  body: any;
  since?: string;
  until?: string;
  stream?: string;
  messageId?: string;
  timestamp?: string;
  receiptHandle?: string;
}

interface MessageData {
  functionName: string;
  customerId: string;
  collectorId: string;
  queueUrl: string;
  sqsEnabled: boolean;
  sqsAttributes: any;
  messages?: Message[];
  latestMessage?: Message;
  error?: string;
}

interface AllMessagesTableProps {
  collectors: MessageData[];
  copyToClipboard: (text: string) => void;
}

interface MessageRowItem {
  collector: MessageData;
  message: Message | null;
  error: string | null;
}

export function AllMessagesTable({ collectors, copyToClipboard }: AllMessagesTableProps) {
  // Create a flat array of all messages from all collectors
  const allMessagesFlat: MessageRowItem[] = [];
  
  collectors.forEach(collector => {
    if (collector.error || !collector.messages?.length) {
      allMessagesFlat.push({
        collector,
        message: null,
        error: collector.error || null
      });
    } else {
      collector.messages.forEach(message => {
        allMessagesFlat.push({
          collector,
          message,
          error: null
        });
      });
    }
  });

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
      <table className="min-w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-300 sticky top-0">
            <th className="border-r border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Function Name</th>
            <th className="border-r border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Customer ID</th>
            <th className="border-r border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Collector ID</th>
            <th className="border-r border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">SQS Enabled</th>
            <th className="border-r border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Message ID</th>
            <th className="border-r border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Timestamp</th>
            <th className="border-r border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Since</th>
            <th className="border-r border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Until</th>
            <th className="border-r border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Stream</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Message Body</th>
          </tr>
        </thead>
        <tbody>
          {allMessagesFlat.map((item, i) => (
            <tr key={i} className={`border-b border-gray-200 transition-all duration-200 ${
              i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'
            } hover:bg-blue-50/80 hover:shadow-md`}>
              <td 
                className="border-r border-gray-200 px-3 py-2 font-mono text-xs cursor-pointer hover:bg-blue-100 transition-all duration-200 group"
                onClick={() => copyToClipboard(item.collector.functionName)}
                title="Click to copy function name"
              >
                <div className="break-all group-hover:text-blue-700 font-medium">{item.collector.functionName}</div>
              </td>
              <td 
                className="border-r border-gray-200 px-3 py-2 text-center text-xs font-semibold cursor-pointer hover:bg-green-100 transition-all duration-200 group"
                onClick={() => copyToClipboard(item.collector.customerId || '')}
                title="Click to copy customer ID"
              >
                <div className="group-hover:text-green-700">{item.collector.customerId || "-"}</div>
              </td>
              <td 
                className="border-r border-gray-200 px-3 py-2 text-center text-xs font-semibold cursor-pointer hover:bg-green-100 transition-all duration-200 group"
                onClick={() => copyToClipboard(item.collector.collectorId || '')}
                title="Click to copy collector ID"
              >
                <div className="group-hover:text-green-700">{item.collector.collectorId || "-"}</div>
              </td>
              <td className="border-r border-gray-200 px-3 py-2 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.collector.sqsEnabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {item.collector.sqsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </td>
              <td 
                className="border-r border-gray-200 px-3 py-2 text-center text-xs cursor-pointer hover:bg-blue-100 transition-all duration-200 group"
                onClick={() => copyToClipboard(item.message?.messageId || '')}
                title="Click to copy message ID"
              >
                {item.message?.messageId ? (
                  <span className="group-hover:text-blue-700 font-mono">
                    {item.message.messageId.substring(0, 12)}...
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="border-r border-gray-200 px-3 py-2 text-center text-xs">
                {item.message?.timestamp ? (
                  <span className="font-mono text-gray-600">
                    {new Date(item.message.timestamp).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td 
                className="border-r border-gray-200 px-3 py-2 text-center font-mono text-xs cursor-pointer hover:bg-cyan-100 transition-all duration-200 group"
                onClick={() => copyToClipboard(item.message?.since || '')}
                title="Click to copy since date"
              >
                {item.message?.since ? (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded border border-green-300 font-semibold group-hover:bg-green-200">
                    {item.message.since}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td 
                className="border-r border-gray-200 px-3 py-2 text-center font-mono text-xs cursor-pointer hover:bg-cyan-100 transition-all duration-200 group"
                onClick={() => copyToClipboard(item.message?.until || '')}
                title="Click to copy until date"
              >
                {item.message?.until ? (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-300 font-semibold group-hover:bg-blue-200">
                    {item.message.until}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td 
                className="border-r border-gray-200 px-3 py-2 text-center font-mono text-xs cursor-pointer hover:bg-purple-100 transition-all duration-200 group"
                onClick={() => copyToClipboard(item.message?.stream || '')}
                title="Click to copy stream name"
              >
                {item.message?.stream ? (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded border border-purple-300 font-semibold group-hover:bg-purple-200 truncate block">
                    {item.message.stream}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-3 py-2">
                {item.error ? (
                  <div 
                    className="text-red-600 cursor-pointer p-2 rounded bg-red-50 border border-red-200"
                    onClick={() => copyToClipboard(item.error || '')}
                    title="Click to copy error message"
                  >
                    ❌ {item.error}
                  </div>
                ) : item.message ? (
                  <div 
                    className="text-xs text-gray-600 bg-gray-50 p-2 rounded border cursor-pointer max-h-32 overflow-y-auto hover:bg-gray-100 transition-colors max-w-md"
                    onClick={() => {
                      const bodyText = typeof item.message?.body === 'string' 
                        ? item.message.body 
                        : JSON.stringify(item.message?.body, null, 2);
                      copyToClipboard(bodyText);
                    }}
                    title="Click to copy message body"
                  >
                    {typeof item.message.body === 'string' 
                      ? item.message.body 
                      : JSON.stringify(item.message.body, null, 2)
                    }
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">No message</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}