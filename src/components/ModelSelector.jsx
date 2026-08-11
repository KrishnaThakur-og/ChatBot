export default function ModelSelector({ models, selected, onChange, loading }) {
    return (
        <div className="model-selector">
            <label>Model</label>
            <select
                value={selected}
                onChange={(e) => onChange(e.target.value)}
                disabled={loading || models.length === 0}
            >
                {models.length === 0 ? (
                    <option value="">No models available</option>
                ) : (
                    models.map((m) => (
                        <option key={m.name} value={m.name}>
                            {m.name}
                        </option>
                    ))
                )}
            </select>
        </div>
    );
}
