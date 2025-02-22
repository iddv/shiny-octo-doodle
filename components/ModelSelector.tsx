import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { llmOptions } from "@/config/llm"
import { Button } from "@/components/ui/button"

interface ModelSelectorProps {
  endpoint: string
  model: string
  setEndpoint: (endpoint: string) => void
  setModel: (model: string) => void
  onLoad: () => void
}

export default function ModelSelector({ 
  endpoint, 
  model, 
  setEndpoint, 
  setModel,
  onLoad 
}: ModelSelectorProps) {
  const handleEndpointChange = (value: string) => {
    console.log("🔌 ModelSelector: Endpoint changed to", value);
    setEndpoint(value);
  };

  const handleModelChange = (value: string) => {
    console.log("🤖 ModelSelector: Model changed to", value);
    setModel(value);
  };

  const handleLoad = () => {
    console.log("🎲 ModelSelector: Load button clicked with", {
      endpoint,
      model
    });
    onLoad();
  };

  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-2 text-space-accent">Model Configuration</h2>
      <div className="space-y-2">
        <div>
          <label className="text-sm text-gray-200">Endpoint</label>
          <Select value={endpoint} onValueChange={handleEndpointChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select endpoint" />
            </SelectTrigger>
            <SelectContent>
              {llmOptions.endpoints.map((ep) => (
                <SelectItem key={ep} value={ep}>
                  {ep}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-gray-200">Model</label>
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {llmOptions.models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleLoad}
          className="w-full bg-space-accent hover:bg-space-accent/80"
        >
          Load Adventure
        </Button>
      </div>
    </div>
  )
} 