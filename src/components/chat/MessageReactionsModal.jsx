import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getUserName = (email, users) => {
  const user = users?.find(u => u.email === email);
  return user?.display_name || user?.full_name || email;
};

export default function MessageReactionsModal({ open, onClose, reactions, users = [] }) {
  // reactions: { emoji: [emails] }
  if (!open || !reactions || Object.keys(reactions).length === 0) {
    return null;
  }

  const isMobile = window.innerWidth < 768;

  // Transform reactions to list format
  const reactionsArray = Object.entries(reactions)
    .filter(([_, emails]) => emails && emails.length > 0)
    .map(([emoji, emails]) => ({
      emoji,
      emails,
      count: emails.length,
    }))
    .sort((a, b) => b.count - a.count);

  // All users who reacted
  const allReactedEmails = Array.from(new Set(reactionsArray.flatMap(r => r.emails)));
  const allReactedUsers = allReactedEmails.map(email => ({
    email,
    name: getUserName(email, users),
  }));

  const ReactionsList = ({ emails }) => (
    <div className="space-y-2">
      {emails.map(email => {
        const name = getUserName(email, users);
        return (
          <div key={email} className="flex items-center gap-3 p-2 rounded hover:bg-accent">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-primary/20 text-xs">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{name}</p>
              {name !== email && (
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const AllReactionsView = () => (
    <div className="space-y-4">
      {reactionsArray.map(({ emoji, emails, count }) => (
        <div key={emoji} className="space-y-2">
          <div className="flex items-center gap-2 sticky top-0 bg-background py-2 border-b">
            <span className="text-2xl">{emoji}</span>
            <Badge variant="secondary">{count}</Badge>
          </div>
          <ReactionsList emails={emails} />
        </div>
      ))}
    </div>
  );

  const content = (
    <div className="w-full h-full flex flex-col">
      {reactionsArray.length > 1 ? (
        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto gap-1">
            <TabsTrigger
              value="all"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Todos ({allReactedEmails.length})
            </TabsTrigger>
            {reactionsArray.map(({ emoji, count }) => (
              <TabsTrigger
                key={emoji}
                value={emoji}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <span className="text-lg">{emoji}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="all" className="p-4">
              <AllReactionsView />
            </TabsContent>
            {reactionsArray.map(({ emoji, emails, count }) => (
              <TabsContent key={emoji} value={emoji} className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 py-2">
                    <span className="text-2xl">{emoji}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                  <ReactionsList emails={emails} />
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {reactionsArray[0] && (
              <>
                <div className="flex items-center gap-2 py-2">
                  <span className="text-2xl">{reactionsArray[0].emoji}</span>
                  <Badge variant="secondary">{reactionsArray[0].count}</Badge>
                </div>
                <ReactionsList emails={reactionsArray[0].emails} />
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="flex flex-col h-[70vh] rounded-t-lg p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>Reações</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[600px] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Quem reagiu</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}