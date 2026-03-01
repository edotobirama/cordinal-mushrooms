
import { RECIPES } from "@/lib/recipes";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function RecipesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Recipes</h1>
                <p className="text-muted-foreground">
                    Standard operating procedures and ingredient lists for production.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(RECIPES).map(([name, ingredients]) => (
                    <Card key={name}>
                        <CardHeader>
                            <CardTitle className="text-lg">{name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ingredient</TableHead>
                                        <TableHead className="text-right">Amount (per unit)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ingredients.map((ing, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{ing.material}</TableCell>
                                            <TableCell className="text-right">
                                                {ing.amount} {ing.unit}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
