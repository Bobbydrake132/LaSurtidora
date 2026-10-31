<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Simulación de Base de Datos de Inventario (MySQL)
$dbFile = __DIR__ . '/database.json';

// Si no existe la base de datos local, la inicializamos
if (!file_exists($dbFile)) {
    $initialData = [
        ["id" => 1, "nombre" => "Arroz Extra 1kg", "precio" => 28.50, "stock" => 5],
        ["id" => 2, "nombre" => "Aceite Vegetal 900ml", "precio" => 45.00, "stock" => 2],
        ["id" => 3, "nombre" => "Frijol Negro 1kg", "precio" => 34.00, "stock" => 0]
    ];
    file_put_contents($dbFile, json_encode($initialData, JSON_PRETTY_PRINT));
}

$productos = json_decode(file_get_contents($dbFile), true);
$method = $_SERVER['REQUEST_METHOD'];

// GET /api.php -> Devuelve el catálogo con el stock actual
if ($method === 'GET') {
    echo json_encode($productos);
    exit;
}

// POST /api.php -> Procesamiento atómico de la compra (Backend)
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['items']) || empty($input['items'])) {
        http_response_code(400);
        echo json_encode(["error" => "El payload está vacío o malformado."]);
        exit;
    }

    // 1. Bloqueo y Verificación de Stock (Validación ACID)
    foreach ($input['items'] as $item) {
        foreach ($productos as $index => $prod) {
            if ($prod['id'] == $item['producto_id']) {
                if ($prod['stock'] < $item['cantidad']) {
                    // HTTP 409 Conflict por falta de stock (Anti-Overselling)
                    http_response_code(409);
                    echo json_encode([
                        "error" => "Stock insuficiente para {$prod['nombre']}. Disponibles: {$prod['stock']}."
                    ]);
                    exit;
                }
            }
        }
    }

    // 2. Transacción: Descuento de inventario
    foreach ($input['items'] as $item) {
        foreach ($productos as &$prod) {
            if ($prod['id'] == $item['producto_id']) {
                $prod['stock'] -= $item['cantidad'];
            }
        }
    }

    // Guardar cambios en la base de datos
    file_put_contents($dbFile, json_encode($productos, JSON_PRETTY_PRINT));

    // HTTP 201 Created
    http_response_code(201);
    echo json_encode([
        "mensaje" => "Compra procesada exitosamente.",
        "folio" => "ORD-" . strtoupper(uniqid())
    ]);
    exit;
}