import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, RotateCcw, Copy, Check, Save } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { toast } from 'sonner';

interface RustfmtOption {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'number' | 'string' | 'enum';
  options?: string[];
  defaultValue: any;
  category: 'General' | 'Imports' | 'Formatting' | 'Advanced';
}

const RUSTFMT_OPTIONS: RustfmtOption[] = [
  // General
  {
    key: 'max_width',
    label: 'Max Width',
    description: 'Maximum width of each line.',
    type: 'number',
    defaultValue: 100,
    category: 'General',
  },
  {
    key: 'hard_tabs',
    label: 'Hard Tabs',
    description: 'Use tab characters instead of spaces.',
    type: 'boolean',
    defaultValue: false,
    category: 'General',
  },
  {
    key: 'tab_spaces',
    label: 'Tab Spaces',
    description: 'Number of spaces per tab.',
    type: 'number',
    defaultValue: 4,
    category: 'General',
  },
  {
    key: 'edition',
    label: 'Edition',
    description: 'The Rust edition to use.',
    type: 'enum',
    options: ['2015', '2018', '2021'],
    defaultValue: '2021',
    category: 'General',
  },
  {
    key: 'newline_style',
    label: 'Newline Style',
    description: 'Unix (LF) or Windows (CRLF) line endings.',
    type: 'enum',
    options: ['Unix', 'Windows', 'Native'],
    defaultValue: 'Unix',
    category: 'General',
  },
  {
    key: 'indent_style',
    label: 'Indent Style',
    description: 'Control whether we use Block or Visual indent.',
    type: 'enum',
    options: ['Block', 'Visual'],
    defaultValue: 'Block',
    category: 'General',
  },
  // Imports
  {
    key: 'reorder_imports',
    label: 'Reorder Imports',
    description: 'Reorder import statements alphabetically.',
    type: 'boolean',
    defaultValue: true,
    category: 'Imports',
  },
  {
    key: 'reorder_modules',
    label: 'Reorder Modules',
    description: 'Reorder module declarations alphabetically.',
    type: 'boolean',
    defaultValue: true,
    category: 'Imports',
  },
  {
    key: 'imports_indent',
    label: 'Imports Indent',
    description: 'Indent style of imports.',
    type: 'enum',
    options: ['Block', 'Visual'],
    defaultValue: 'Visual',
    category: 'Imports',
  },
  {
    key: 'imports_layout',
    label: 'Imports Layout',
    description: 'The layout of import statements.',
    type: 'enum',
    options: ['Horizontal', 'Vertical', 'Mixed', 'HorizontalVertical'],
    defaultValue: 'Mixed',
    category: 'Imports',
  },
  {
    key: 'merge_imports',
    label: 'Merge Imports',
    description: 'Merge imports from the same crate into a single use statement.',
    type: 'boolean',
    defaultValue: false,
    category: 'Imports',
  },
  // Formatting
  {
    key: 'use_field_init_shorthand',
    label: 'Field Init Shorthand',
    description: 'Use field initialization shorthand if possible.',
    type: 'boolean',
    defaultValue: false,
    category: 'Formatting',
  },
  {
    key: 'use_try_shorthand',
    label: 'Try Shorthand',
    description: 'Replace try! macros with ? operator.',
    type: 'boolean',
    defaultValue: true,
    category: 'Formatting',
  },
  {
    key: 'match_block_trailing_comma',
    label: 'Match Block Trailing Comma',
    description: 'Put a trailing comma after a block arm of a match expression.',
    type: 'boolean',
    defaultValue: false,
    category: 'Formatting',
  },
  {
    key: 'struct_field_align_threshold',
    label: 'Struct Field Align Threshold',
    description: 'If set, align struct fields up to this threshold.',
    type: 'number',
    defaultValue: 0,
    category: 'Formatting',
  },
  {
    key: 'remove_nested_parens',
    label: 'Remove Nested Parens',
    description: 'Remove nested parens.',
    type: 'boolean',
    defaultValue: true,
    category: 'Formatting',
  },
  {
    key: 'control_brace_style',
    label: 'Control Brace Style',
    description: 'Brace style for control flow constructs.',
    type: 'enum',
    options: ['AlwaysNextLine', 'ClosingNextLine', 'SameLineOrIndent'],
    defaultValue: 'SameLineOrIndent',
    category: 'Formatting',
  },
  // Advanced
  {
    key: 'error_on_line_overflow',
    label: 'Error on Line Overflow',
    description: 'Error if a line is longer than max_width.',
    type: 'boolean',
    defaultValue: false,
    category: 'Advanced',
  },
  {
    key: 'type_smaller_than_byte_limit',
    label: 'Type Smaller Than Byte Limit',
    description: 'Maximum size of a type that will be formatted as a single line.',
    type: 'number',
    defaultValue: 80,
    category: 'Advanced',
  },
  {
    key: 'verbose',
    label: 'Verbose',
    description: 'Write verbose output to stdout.',
    type: 'enum',
    options: ['Quiet', 'Normal', 'Verbose'],
    defaultValue: 'Normal',
    category: 'Advanced',
  },
];

const STELLAR_RECOMMENDED = {
  max_width: 100,
  hard_tabs: false,
  tab_spaces: 4,
  edition: '2021',
  newline_style: 'Unix',
  reorder_imports: true,
  reorder_modules: true,
  use_field_init_shorthand: true,
  use_try_shorthand: true,
};

const DEFAULT_CONFIG = RUSTFMT_OPTIONS.reduce((acc, opt) => {
  acc[opt.key] = opt.defaultValue;
  return acc;
}, {} as Record<string, any>);

const RustfmtEditor: React.FC = () => {
  const { files, createFile, updateFileContent } = useWorkspaceStore();
  const [config, setConfig] = useState<Record<string, any>>(STELLAR_RECOMMENDED);
  const [tomlPreview, setTomlPreview] = useState('');

  // Try to load existing .rustfmt.toml on mount
  useEffect(() => {
    const existingFile = files.find(f => f.name === '.rustfmt.toml');
    if (existingFile && existingFile.content) {
      try {
        const parsed = parseToml(existingFile.content);
        if (Object.keys(parsed).length > 0) {
          setConfig(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.error('Failed to parse existing .rustfmt.toml', e);
      }
    }
  }, []);

  useEffect(() => {
    generateToml(config);
  }, [config]);

  const parseToml = (content: string) => {
    const newConfig: Record<string, any> = {};
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length === 2) {
        const key = parts[0].trim();
        const rawValue = parts[1].trim();
        let val: any = rawValue.replace(/^"|"$/g, '');
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (!isNaN(Number(val))) val = Number(val);
        newConfig[key] = val;
      }
    });
    return newConfig;
  };

  const generateToml = (currentConfig: Record<string, any>) => {
    const lines = Object.entries(currentConfig)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => {
        const option = RUSTFMT_OPTIONS.find(o => o.key === key);
        if (option?.type === 'string' || option?.type === 'enum') {
          return `${key} = "${value}"`;
        }
        return `${key} = ${value}`;
      });
    setTomlPreview(lines.join('\n'));
  };

  const saveToWorkspace = () => {
    const existingFile = files.find(f => f.name === '.rustfmt.toml');
    if (existingFile) {
      updateFileContent(['.rustfmt.toml'], tomlPreview);
      toast.success('.rustfmt.toml updated in workspace root');
    } else {
      createFile([], '.rustfmt.toml', tomlPreview);
      toast.success('.rustfmt.toml created in workspace root');
    }
  };

  const handleToggle = (key: string, value: boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleInputChange = (key: string, value: string | number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const setStellarProfile = () => {
    setConfig(STELLAR_RECOMMENDED);
  };

  const importFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.toml';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newConfig = parseToml(content);
        setConfig(newConfig);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const downloadToml = () => {
    const blob = new Blob([tomlPreview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rustfmt.toml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = ['General', 'Imports', 'Formatting', 'Advanced'] as const;

  return (
    <Card className="border-none bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Rustfmt Configuration</CardTitle>
            <CardDescription>
              Configure how rustfmt should format your Cargo projects.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={setStellarProfile}>
              Stellar Profile
            </Button>
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Tabs defaultValue="General" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                {categories.map(cat => (
                  <TabsTrigger key={cat} value={cat}>
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map(cat => (
                <TabsContent key={cat} value={cat} className="space-y-4 pt-4">
                  <ScrollArea className="h-[450px] pr-4">
                    <div className="space-y-6">
                      {RUSTFMT_OPTIONS.filter(o => o.category === cat).map(opt => (
                        <div key={opt.key} className="flex flex-col space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base font-semibold">{opt.label}</Label>
                              <p className="text-sm text-muted-foreground">{opt.description}</p>
                            </div>
                            {opt.type === 'boolean' && (
                              <Switch
                                id={`toggle-${opt.key}`}
                                checked={config[opt.key] ?? false}
                                onCheckedChange={(checked) => handleToggle(opt.key, checked)}
                              />
                            )}
                          </div>
                          {opt.type === 'number' && (
                            <Input
                              id={`input-${opt.key}`}
                              type="number"
                              value={config[opt.key] ?? ''}
                              onChange={(e) => handleInputChange(opt.key, parseInt(e.target.value))}
                              className="w-32"
                            />
                          )}
                          {opt.type === 'enum' && (
                            <Select
                              value={config[opt.key]}
                              onValueChange={(val) => handleInputChange(opt.key, val)}
                            >
                              <SelectTrigger id={`select-${opt.key}`} className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {opt.options?.map(o => (
                                  <SelectItem key={o} value={o}>
                                    {o}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Separator className="mt-4" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="flex flex-col space-y-4 bg-muted/30 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Virtual .rustfmt.toml Preview</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/20" onClick={saveToWorkspace} title="Apply to Workspace">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => {
                  navigator.clipboard.writeText(tomlPreview);
                  toast.success('Copied to clipboard');
                }} title="Copy to Clipboard">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={downloadToml} title="Download TOML">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={importFromFile} title="Import from File">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-zinc-950 rounded-lg p-5 font-mono text-sm overflow-auto border border-zinc-800 shadow-inner">
              <pre className="text-green-500/90 leading-relaxed">
                {tomlPreview || '# No rules configured'}
              </pre>
            </div>
            <p className="text-[10px] text-muted-foreground italic text-center">
              TIP: Click the Save icon to sync this config with your workspace root.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between border-t border-zinc-800/50 pt-6">
        <p className="text-xs text-muted-foreground">
          Stellar Suite uses <code className="text-primary">rustfmt</code> for automated code formatting. Pro-tip: you can also manually edit .rustfmt.toml in the explorer.
        </p>
      </CardFooter>
    </Card>
  );
};

export default RustfmtEditor;
