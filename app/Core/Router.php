<?php

declare(strict_types=1);

namespace App\Core;

use Closure;

class Router
{
    /**
     * @var array<string, Closure>
     */
    private array $routes = [];

    public function get(string $path, Closure $handler): void
    {
        $this->addRoute('GET', $path, $handler);
    }

    public function post(string $path, Closure $handler): void
    {
        $this->addRoute('POST', $path, $handler);
    }

    public function put(string $path, Closure $handler): void
    {
        $this->addRoute('PUT', $path, $handler);
    }

    public function delete(string $path, Closure $handler): void
    {
        $this->addRoute('DELETE', $path, $handler);
    }

    public function dispatch(string $method, string $path): bool
    {
        $key = strtoupper($method) . ' ' . $path;

        if (!isset($this->routes[$key])) {
            return false;
        }

        $this->routes[$key]();

        return true;
    }

    private function addRoute(string $method, string $path, Closure $handler): void
    {
        $key = strtoupper($method) . ' ' . $path;
        $this->routes[$key] = $handler;
    }
}
