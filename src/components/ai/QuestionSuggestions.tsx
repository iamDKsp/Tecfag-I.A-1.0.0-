import React from 'react';
import { Sparkles } from 'lucide-react';

interface QuestionSuggestionsProps {
    suggestions: string[];
    onSelectSuggestion: (suggestion: string) => void;
    loading?: boolean;
}

export function QuestionSuggestions({
    suggestions,
    onSelectSuggestion,
    loading
}: QuestionSuggestionsProps) {
    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Gerando sugestões...</span>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">Perguntas sugeridas:</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onSelectSuggestion(suggestion)}
                        className="
              px-3 py-2 rounded-lg text-sm text-left
              bg-gradient-to-r from-blue-50 to-indigo-50 
              dark:from-blue-900/20 dark:to-indigo-900/20
              border border-blue-200 dark:border-blue-800
              hover:from-blue-100 hover:to-indigo-100
              dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30
              transition-all duration-200
              hover:shadow-md hover:scale-[1.02]
              text-gray-700 dark:text-gray-300
              max-w-full break-words
            "
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
}
