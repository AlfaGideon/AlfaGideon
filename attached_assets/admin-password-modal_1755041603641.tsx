import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hapticFeedback, notificationFeedback } from '@/lib/telegram';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminPasswordModal({ isOpen, onClose, onSuccess }: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/auth/admin', { password });
      hapticFeedback('heavy');
      notificationFeedback('success');
      onSuccess();
      onClose();
      setPassword('');
    } catch (error) {
      notificationFeedback('error');
      toast({
        title: "Ошибка доступа",
        description: "Неверный пароль администратора",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-sm mx-4">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-admin-red rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <DialogTitle className="text-xl font-bold text-telegram-text mb-2">
            Доступ администратора
          </DialogTitle>
          <p className="text-telegram-secondary text-sm">Введите пароль для продолжения</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Пароль администратора"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
            data-testid="input-admin-password"
            disabled={isLoading}
          />
          
          <div className="flex space-x-3">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              data-testid="button-cancel-admin"
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-admin-red hover:bg-red-600 text-white"
              data-testid="button-submit-admin"
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? 'Проверка...' : 'Войти'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
