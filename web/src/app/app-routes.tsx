import { useState, useEffect } from 'react';
import { Link, Navigate, useRoutes } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { getWalletBalance } from './utils/wallet';
import { createPaymentTx } from './transaction';
import { PublicKey } from '@solana/web3.js';

export function AppRoutes() {
  return useRoutes([
    { index: true, element: <Navigate replace to="/home" /> },
    { path: '/home', element: <Terminal /> },
    {
      path: '/page-1',
      element: (
        <div>
          <p>Page 1 content</p>
          <Link to="/home">Home</Link>
        </div>
      ),
    },
  ]);
}

function Terminal() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (publicKey) {
      fetchWalletData();
    }
  }, [publicKey]);

  const fetchWalletData = async () => {
    try {
      if (publicKey) {
        const balance = await getWalletBalance(connection, publicKey);
        setBalance(balance);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCommand(command);
    setCommand('');
  };

  const processCommand = async (command: string) => {
    const commandOutput = `$ ${command}`;
    setOutput((prev) => [...prev, commandOutput]);

    const [cmd, ...args] = command.split(' ');

    switch (cmd) {
      case 'pay':
        if (publicKey && signTransaction && args.length === 2) {
          try {
            const amount = parseFloat(args[0]);
            const recipient = args[1];
            const txid = await createPaymentTx(amount, recipient, publicKey, signTransaction, connection);
            setOutput((prev) => [...prev, `Transaction submitted: ${txid}`]);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setOutput((prev) => [...prev, `Error: ${errorMessage}`]);
          }
        } else {
          setOutput((prev) => [...prev, 'Invalid parameters. Usage: pay <amount> <recipient>']);
        }
        break;
      case 'balance':
        if (publicKey) {
          try {
            const balance = await getWalletBalance(connection, publicKey);
            setOutput((prev) => [...prev, `Wallet balance: ${balance} SOL`]);
          } catch (error) {
            setOutput((prev) => [...prev, 'Error fetching balance']);
          }
        } else {
          setOutput((prev) => [...prev, 'Wallet not connected']);
        }
        break;
      case 'disconnect':
        setOutput((prev) => [...prev, 'Wallet disconnected.']);
        break;
      case 'help':
        setOutput((prev) => [...prev, ...getHelpMessage()]);
        break;
      default:
        setOutput((prev) => [...prev, 'Invalid command. Type "help" for a list of commands.']);
    }
  };

  const getHelpMessage = () => [
    'Available Commands:',
    '1. pay <amount> <recipient> - Send a specified amount of SOL to a recipient',
    '2. balance - Check the current wallet balance',
    '3. disconnect - Disconnect the wallet',
    '4. help - Show this help message',
  ];

  const renderPrompt = () => {
    if (publicKey) {
      return `${publicKey.toBase58()}@unruggable.sh $`;
    } else {
      return 'anon@unruggable.sh $';
    }
  };

  return (
    <div className="terminal">
      <div className="terminal-output">
        {publicKey && (
          <>
            <p>Welcome to Unruggable</p>
            <p>Connected Wallet: {publicKey.toBase58()}</p>
            <p>Balance: {balance} SOL</p>
            <p>Options:</p>
            {getHelpMessage().map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </>
        )}
        {output.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="terminal-input">
        <span>{renderPrompt()}</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          autoFocus
        />
      </form>
    </div>
  );
}

export default Terminal;